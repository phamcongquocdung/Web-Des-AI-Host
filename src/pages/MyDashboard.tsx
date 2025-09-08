import React, { useEffect, useMemo, useRef, useState } from "react";
import "./my-dashboard.css";

import {
  ensureTable,
  listProjects,
  createProject,
  getProject,
  saveProject,
  deleteProject,
} from "../lib/jsonStore";
import { supabase } from "../lib/supabase";

/* ========= Types ========= */
type Status = "research" | "process" | "review" | "done";

type Task = {
  id: string;
  title: string;
  description?: string;
  assignee?: string;
  priority?: "low" | "medium" | "high";
  status: Status;
};

type Phase = {
  id: string;
  name: string;
  description?: string;
  collapsed?: boolean;
  laneCollapsed?: Partial<Record<Status, boolean>>;
  tasks: Task[];
};

type Project = { id: string; name: string; phases: Phase[] };

const uid = () => Math.random().toString(36).slice(2, 9);
const statusLabel: Record<Status, string> = {
  research: "In Research",
  process: "In Process",
  review: "In Review",
  done: "Done",
};

type ModalKind =
  | null
  | { type: "project-new" }
  | { type: "project-edit"; id: string }
  | { type: "phase"; projectId: string; id?: string }
  | { type: "task"; projectId: string; phaseId: string; taskId?: string };

/* ===== Hook lấy user từ Supabase ===== */
function useSupabaseUser() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}

export default function MyDashboard() {
  const { user, loading } = useSupabaseUser();

  // state chính
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentId, setCurrentId] = useState<string>("");
  const [modal, setModal] = useState<ModalKind>(null);
  const [persistReady, setPersistReady] = useState(false);

  const current =
    projects.find((p) => p.id === currentId) ||
    ({ id: "", name: "", phases: [] } as Project);

  /* ===== UI states ===== */
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>(
    {}
  );
  const toggleTask = (taskId: string) =>
    setExpandedTasks((m) => ({ ...m, [taskId]: !m[taskId] }));

  const [dragOver, setDragOver] = useState<Record<string, boolean>>({});
  const laneKey = (phaseId: string, st: Status) => `${phaseId}:${st}`;

  /* ===== Load danh sách theo user ===== */
  useEffect(() => {
    (async () => {
      setPersistReady(false);
      setProjects([]);
      setCurrentId("");

      if (loading) return;
      if (!user) return;

      try {
        await ensureTable();
        const ownerId = user.id as string;

        let list = await listProjects(ownerId);

        if (!list.length) {
          // user mới -> tạo 1 project blank trực tiếp trong DB để nhận id thật
          const blank: Project = { id: uid(), name: "New Project", phases: [] };
          const newId = await createProject(blank.name, { ...blank }, ownerId);
          list = [{ id: newId, name: blank.name }];
        }

        setProjects(list.map((p) => ({ id: p.id, name: p.name, phases: [] })));
        setCurrentId(list[0].id);
        setPersistReady(true);
      } catch (e) {
        console.error("[DB load error]", e);
        setPersistReady(false);
      }
    })();
  }, [user, loading]);

  /* ===== Nạp chi tiết khi đổi project ===== */
  useEffect(() => {
    if (!persistReady || !user || !currentId) return;

    let alive = true;
    (async () => {
      try {
        const detail = await getProject(currentId, user.id);
        if (!alive || !detail?.data) return;
        const data = detail.data as Project;

        setProjects((arr) => {
          const exists = arr.some((p) => p.id === detail.id);
          return exists
            ? arr.map((p) => (p.id === detail.id ? data : p))
            : [...arr, data];
        });
      } catch (e) {
        console.error("[load project by id error]", e);
      }
    })();

    return () => {
      alive = false;
    };
  }, [currentId, persistReady, user]);

  /* ===== Helpers: auto-save debounce ===== */
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persist = (p: Project) => {
    if (!persistReady || !user) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveProject(p.id, p.name, p, user.id).catch(console.error);
    }, 400);
  };

  const mutateCurrent = (fn: (p: Project) => Project) => {
    setProjects((arr) => {
      const next = arr.map((p) => (p.id === currentId ? fn(p) : p));
      const cur = next.find((p) => p.id === currentId);
      if (cur) persist(cur);
      return next;
    });
  };

  const setCurrentIdSafe = (id: string) => {
    if (projects.some((p) => p.id === id)) setCurrentId(id);
  };

  /* ===== Progress ===== */
  const progress = useMemo(() => {
    const all = current.phases.flatMap((p) => p.tasks);
    const done = all.filter((t) => t.status === "done").length;
    return all.length ? Math.round((done / all.length) * 100) : 0;
  }, [current]);

  /* ===== Open modals ===== */
  const openNewProject = () => setModal({ type: "project-new" });
  const openEditProject = () =>
    setModal({ type: "project-edit", id: currentId });
  const openCreatePhase = () =>
    setModal({ type: "phase", projectId: currentId });
  const openEditPhase = (id: string) =>
    setModal({ type: "phase", projectId: currentId, id });
  const openCreateTask = (pid: string) =>
    setModal({ type: "task", projectId: currentId, phaseId: pid });
  const openEditTask = (pid: string, tid: string) =>
    setModal({ type: "task", projectId: currentId, phaseId: pid, taskId: tid });

  /* ===== Delete ===== */
  const removeProject = () => {
    if (!confirm(`Delete project "${current.name}"?`)) return;
    if (!user) return;

    (async () => {
      try {
        if (persistReady) await deleteProject(currentId, user.id);
      } catch (e) {
        console.error("[deleteProject error]", e);
      }

      setProjects((arr) => {
        const next = arr.filter((p) => p.id !== currentId);

        if (next.length === 0) {
          // nếu xoá hết -> tạo một project rỗng mới cho user
          (async () => {
            try {
              const blank: Project = {
                id: uid(),
                name: "New Project",
                phases: [],
              };
              const id = await createProject(blank.name, { ...blank }, user.id);
              setProjects([{ id, name: blank.name, phases: [] }]);
              setCurrentId(id);
            } catch (e) {
              console.error("[create after delete error]", e);
            }
          })();
          return [];
        }

        setCurrentId(next[0].id);
        if (persistReady) {
          getProject(next[0].id, user.id).then((d) => {
            if (d?.data) {
              setProjects((arr2) =>
                arr2.map((x) => (x.id === d.id ? (d.data as Project) : x))
              );
            }
          });
        }
        return next;
      });
    })();
  };

  const removePhase = (id: string) => {
    if (!confirm("Delete this phase?")) return;
    mutateCurrent((prj) => ({
      ...prj,
      phases: prj.phases.filter((p) => p.id !== id),
    }));
  };

  const removeTask = (pid: string, tid: string) => {
    if (!confirm("Delete this task?")) return;
    mutateCurrent((prj) => ({
      ...prj,
      phases: prj.phases.map((p) =>
        p.id === pid ? { ...p, tasks: p.tasks.filter((t) => t.id !== tid) } : p
      ),
    }));
  };

  /* ===== DnD ===== */
  const onDragStart = (
    e: React.DragEvent,
    payload: { phaseId: string; taskId: string }
  ) => {
    const data = JSON.stringify(payload);
    e.dataTransfer.setData("application/json", data);
    e.dataTransfer.setData("text/plain", data);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDropTo = (e: React.DragEvent, phaseId: string, status: Status) => {
    e.preventDefault();
    const txt =
      e.dataTransfer.getData("application/json") ||
      e.dataTransfer.getData("text/plain");
    if (!txt) return;
    const { phaseId: fromPhase, taskId } = JSON.parse(txt) as {
      phaseId: string;
      taskId: string;
    };

    mutateCurrent((prj) => {
      let moving: Task | undefined;
      const phases = prj.phases.map((p) => {
        if (p.id === fromPhase) {
          const i = p.tasks.findIndex((t) => t.id === taskId);
          if (i >= 0) {
            moving = { ...p.tasks[i] };
            const cp = [...p.tasks];
            cp.splice(i, 1);
            return { ...p, tasks: cp };
          }
        }
        return p;
      });
      if (!moving) return prj;
      moving.status = status;
      return {
        ...prj,
        phases: phases.map((p) =>
          p.id === phaseId ? { ...p, tasks: [...p.tasks, moving!] } : p
        ),
      };
    });
  };

  /* ===== Lane collapse ===== */
  const toggleLane = (phaseId: string, st: Status) => {
    mutateCurrent((prj) => ({
      ...prj,
      phases: prj.phases.map((p) =>
        p.id === phaseId
          ? {
              ...p,
              laneCollapsed: {
                ...(p.laneCollapsed || {}),
                [st]: !p.laneCollapsed?.[st],
              },
            }
          : p
      ),
    }));
  };

  // khi chưa đăng nhập
  if (!loading && !user) {
    return (
      <div className="mdash dark" style={{ padding: 24 }}>
        <div className="panel">
          <div className="panel-title">Project Dashboard</div>
          <p style={{ opacity: 0.8 }}>Please sign in to see your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mdash dark">
      {/* TOP BAR */}
      <div className="mdash-top">
        <div className="top-left">
          <h1 className="page-title">Project Dashboard</h1>
          <span className="divider">/</span>

          {/* Project Picker */}
          <div className="project-picker">
            <label className="picker-label">Project</label>
            <div className="picker-control">
              <select
                className="proj-select nice"
                value={currentId}
                onChange={(e) => setCurrentIdSafe(e.target.value)}
                title="Select project"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="icon-btn pill"
              onClick={openEditProject}
              title="Edit current project"
              aria-label="Edit project"
            >
              ✏️
            </button>

            <button
              className="pill-btn"
              onClick={openNewProject}
              title="Create new project"
            >
              ＋ New Project
            </button>
          </div>
        </div>

        <div className="top-actions">
          <button className="ghost-btn" onClick={openCreatePhase}>
            ＋ New Phase
          </button>
          <button className="danger-btn" onClick={removeProject}>
            🗑 Delete Project
          </button>
        </div>
      </div>

      <div className="mdash-grid">
        {/* LEFT */}
        <aside className="left">
          <div className="panel">
            <div className="panel-title">Project Overview</div>
            <div className="project-name">{current.name}</div>

            <div className="ring">
              <Donut percent={progress} />
              <div className="ring-caption">
                <div className="ring-title">Overall Progress</div>
                <div className="ring-value">{progress}%</div>
              </div>
            </div>

            {current.phases.map((p) => {
              const all = p.tasks.length;
              const done = p.tasks.filter((t) => t.status === "done").length;
              const pct = all ? Math.round((done / all) * 100) : 0;
              return (
                <div className="phase-mini" key={p.id}>
                  <div className="mini-title">{p.name}</div>
                  <div className="mini-ring">
                    <MiniDonut percent={pct} />
                    <span>{pct}%</span>
                  </div>
                  <div className="mini-sub">
                    {done} of {all} tasks completed
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* RIGHT */}
        <section className="right">
          <div className="phases">
            {current.phases.map((ph) => (
              <div className="phase-card" key={ph.id}>
                <div className="phase-head">
                  <details
                    open={!ph.collapsed}
                    onToggle={(e) => {
                      const open = (e.target as HTMLDetailsElement).open;
                      mutateCurrent((prj) => ({
                        ...prj,
                        phases: prj.phases.map((p) =>
                          p.id === ph.id ? { ...p, collapsed: !open } : p
                        ),
                      }));
                    }}
                  >
                    <summary className="sum-row">
                      <span className="name">{ph.name}</span>
                      <span className="desc">{ph.description}</span>
                    </summary>
                  </details>

                  <div className="phase-actions">
                    <span className="pill">{ph.tasks.length} tasks</span>
                    <button
                      className="ghost-btn"
                      onClick={() => openCreateTask(ph.id)}
                    >
                      ＋ Add Task
                    </button>
                    <button
                      className="icon-btn"
                      title="Edit phase"
                      onClick={() => openEditPhase(ph.id)}
                    >
                      ✏️
                    </button>
                    <button
                      className="icon-btn danger"
                      title="Delete phase"
                      onClick={() => removePhase(ph.id)}
                    >
                      🗑
                    </button>
                  </div>
                </div>

                <div className="lanes">
                  {(["research", "process", "review", "done"] as Status[]).map(
                    (st) => {
                      const collapsed = !!ph.laneCollapsed?.[st];
                      const count = ph.tasks.filter(
                        (t) => t.status === st
                      ).length;
                      const k = laneKey(ph.id, st);

                      return (
                        <div
                          key={st}
                          className={`lane lane--${st} ${
                            dragOver[k] ? "is-drag-over" : ""
                          }`}
                          onDragOver={(e) => e.preventDefault()}
                          onDragEnter={() =>
                            setDragOver((m) => ({ ...m, [k]: true }))
                          }
                          onDragLeave={() =>
                            setDragOver((m) => ({ ...m, [k]: false }))
                          }
                          onDrop={(e) => {
                            setDragOver((m) => ({ ...m, [k]: false }));
                            onDropTo(e, ph.id, st);
                          }}
                        >
                          <button
                            className="lane-title as-btn"
                            onClick={() => toggleLane(ph.id, st)}
                          >
                            <span
                              className={`caret ${collapsed ? "" : "open"}`}
                            />
                            <span className="dot" />
                            {statusLabel[st]}
                            <span className="count">{count}</span>
                          </button>

                          {!collapsed && (
                            <div className="cards">
                              {ph.tasks
                                .filter((t) => t.status === st)
                                .map((t) => {
                                  const opened = !!expandedTasks[t.id];
                                  return (
                                    <div
                                      key={t.id}
                                      className={`task ${
                                        opened ? "is-open" : ""
                                      }`}
                                      draggable
                                      onDragStart={(e) =>
                                        onDragStart(e, {
                                          phaseId: ph.id,
                                          taskId: t.id,
                                        })
                                      }
                                    >
                                      <div
                                        className="task-head"
                                        onClick={() => toggleTask(t.id)}
                                      >
                                        <span
                                          className={`caret ${
                                            opened ? "open" : ""
                                          }`}
                                        />
                                        <div className="task-title">
                                          {t.title}
                                        </div>

                                        {t.assignee && (
                                          <span className="assignee">
                                            <span className="avatar">
                                              {initials(t.assignee)}
                                            </span>
                                            <span className="name">
                                              {t.assignee}
                                            </span>
                                          </span>
                                        )}

                                        <button
                                          className="icon-btn"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openEditTask(ph.id, t.id);
                                          }}
                                          title="Edit"
                                        >
                                          ✏️
                                        </button>
                                        <button
                                          className="icon-btn danger"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeTask(ph.id, t.id);
                                          }}
                                          title="Delete"
                                        >
                                          🗑
                                        </button>
                                      </div>

                                      {opened && (
                                        <div className="task-body">
                                          {t.description && (
                                            <div className="task-desc">
                                              {t.description}
                                            </div>
                                          )}
                                          <div className="task-meta">
                                            {t.priority && (
                                              <span
                                                className={`chip chip--${t.priority}`}
                                              >
                                                {t.priority}
                                              </span>
                                            )}
                                            {t.assignee && (
                                              <span className="chip chip--assignee">
                                                Assigned to {t.assignee}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* MODAL */}
      <EditModal
        modal={modal}
        projects={projects}
        currentId={currentId}
        setProjects={setProjects}
        setCurrentId={setCurrentId}
        onClose={() => setModal(null)}
        persistReady={persistReady}
        ownerId={user?.id || ""} // ràng buộc theo user
      />
    </div>
  );
}

/* ===== Helpers ===== */
function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}

/* ===== Donuts ===== */
function Donut({ percent }: { percent: number }) {
  const R = 42,
    C = 2 * Math.PI * R;
  const dash = (percent / 100) * C;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle
        cx="60"
        cy="60"
        r={R}
        stroke="#1b2233"
        strokeWidth="12"
        fill="none"
      />
      <circle
        cx="60"
        cy="60"
        r={R}
        stroke="url(#g)"
        strokeWidth="12"
        fill="none"
        strokeDasharray={`${dash} ${C - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
      />
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4f7fff" />
          <stop offset="100%" stopColor="#2d4de6" />
        </linearGradient>
      </defs>
    </svg>
  );
}
function MiniDonut({ percent }: { percent: number }) {
  const R = 18,
    C = 2 * Math.PI * R;
  const dash = (percent / 100) * C;
  return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle
        cx="24"
        cy="24"
        r={R}
        stroke="#1b2233"
        strokeWidth="8"
        fill="none"
      />
      <circle
        cx="24"
        cy="24"
        r={R}
        stroke="#45d175"
        strokeWidth="8"
        fill="none"
        strokeDasharray={`${dash} ${C - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
      />
    </svg>
  );
}

/* ===== Modal (Project/Phase/Task) ===== */
function EditModal({
  modal,
  projects,
  currentId,
  setProjects,
  setCurrentId,
  onClose,
  persistReady,
  ownerId,
}: {
  modal: ModalKind;
  projects: Project[];
  currentId: string;
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setCurrentId: React.Dispatch<React.SetStateAction<string>>;
  onClose: () => void;
  persistReady: boolean;
  ownerId: string;
}) {
  const current = projects.find((p) => p.id === currentId)!;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("low");
  const [assignee, setAssignee] = useState("");

  useEffect(() => {
    if (!modal) return;

    if (modal.type === "project-new") {
      setName("");
      setDescription("");
    }

    if (modal?.type === "project-edit") {
      const pr = projects.find((p) => p.id === modal.id);
      setName(pr?.name || "");
      setDescription("");
    }

    if (modal?.type === "phase") {
      const ph = modal.id
        ? current.phases.find((p) => p.id === modal.id)
        : undefined;
      setName(ph?.name || "");
      setDescription(ph?.description || "");
    }

    if (modal?.type === "task") {
      const ph = current.phases.find((p) => p.id === modal.phaseId);
      const tk = modal.taskId
        ? ph?.tasks.find((t) => t.id === modal.taskId)
        : undefined;
      setName(tk?.title || "");
      setDescription(tk?.description || "");
      setPriority(tk?.priority || "low");
      setAssignee(tk?.assignee || "");
    }
  }, [modal, current, projects]);

  if (!modal) return null;

  const save = () => {
    // Project NEW — tạo thẳng DB, dùng id DB trả về
    if (modal.type === "project-new") {
      (async () => {
        const nameSafe = name || "New Project";
        const temp: Project = { id: uid(), name: nameSafe, phases: [] };

        if (persistReady && ownerId) {
          try {
            const newId = await createProject(nameSafe, { ...temp }, ownerId);
            const blank: Project = { ...temp, id: newId };

            setProjects((arr) => [...arr, blank]);
            setCurrentId(blank.id);
            await saveProject(blank.id, blank.name, blank, ownerId);
          } catch (e) {
            console.error("[createProject error]", e);
            // fallback local nếu mất mạng
            setProjects((arr) => [...arr, temp]);
            setCurrentId(temp.id);
          }
        } else {
          setProjects((arr) => [...arr, temp]);
          setCurrentId(temp.id);
        }

        onClose();
      })();
      return;
    }

    // Project EDIT
    if (modal.type === "project-edit") {
      setProjects((arr) =>
        arr.map((p) => (p.id === modal.id ? { ...p, name } : p))
      );
      if (persistReady && ownerId) {
        const cur = projects.find((p) => p.id === modal.id);
        if (cur)
          saveProject(cur.id, name, { ...cur, name }, ownerId).catch(
            console.error
          );
      }
      onClose();
      return;
    }

    // Phase NEW/EDIT
    if (modal.type === "phase") {
      const fn = (p: Project) => {
        if (modal.id) {
          return {
            ...p,
            phases: p.phases.map((ph) =>
              ph.id === modal.id ? { ...ph, name, description } : ph
            ),
          };
        }
        return {
          ...p,
          phases: [
            ...p.phases,
            {
              id: uid(),
              name: name || "New Phase",
              description,
              tasks: [],
              laneCollapsed: {},
            },
          ],
        };
      };
      setProjects((arr) => {
        const next = arr.map((pr) => (pr.id === current.id ? fn(pr) : pr));
        if (persistReady && ownerId) {
          const cur = next.find((x) => x.id === current.id);
          if (cur)
            saveProject(cur.id, cur.name, cur, ownerId).catch(console.error);
        }
        return next;
      });
      onClose();
      return;
    }

    // Task NEW/EDIT
    if (modal.type === "task") {
      const fn = (p: Project) => ({
        ...p,
        phases: p.phases.map((ph) => {
          if (ph.id !== modal.phaseId) return ph;
          if (modal.taskId) {
            return {
              ...ph,
              tasks: ph.tasks.map((t) =>
                t.id === modal.taskId
                  ? { ...t, title: name, description, priority, assignee }
                  : t
              ),
            };
          }
          return {
            ...ph,
            tasks: [
              ...ph.tasks,
              {
                id: uid(),
                title: name || "New Task",
                description,
                priority,
                assignee,
                status: "research",
              },
            ],
          };
        }),
      });

      setProjects((arr) => {
        const next = arr.map((pr) => (pr.id === current.id ? fn(pr) : pr));
        if (persistReady && ownerId) {
          const cur = next.find((x) => x.id === current.id);
          if (cur)
            saveProject(cur.id, cur.name, cur, ownerId).catch(console.error);
        }
        onClose();
        return next;
      });
      return;
    }
  };

  const title =
    modal.type === "project-new"
      ? "New Project"
      : modal.type === "project-edit"
      ? "Edit Project"
      : modal.type === "phase"
      ? modal.id
        ? "Edit Phase"
        : "New Phase"
      : modal.taskId
      ? "Edit Task"
      : "New Task";

  return (
    <>
      <div className="md-overlay" onClick={onClose} />
      <div className="md-center">
        <div className="md-card" role="dialog" aria-modal="true">
          <div className="md-header">
            <h4>{title}</h4>
            <button className="x-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>

          <div className="md-content">
            {(modal.type === "project-new" ||
              modal.type === "project-edit") && (
              <div className="field">
                <label>Project Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter project name"
                />
              </div>
            )}

            {modal.type === "phase" && (
              <>
                <div className="field">
                  <label>Phase Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter phase name"
                  />
                </div>
                <div className="field">
                  <label>Description</label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Write a short description"
                  />
                </div>
              </>
            )}

            {modal.type === "task" && (
              <>
                <div className="field">
                  <label>Task Title</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter task title"
                  />
                </div>
                <div className="field">
                  <label>Description</label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Write a short description"
                  />
                </div>
                <div className="field">
                  <label>Assignee</label>
                  <input
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    placeholder="Who is responsible?"
                  />
                </div>
                <div className="field">
                  <label>Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                  >
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="md-footer">
            <button className="ghost-btn" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-cta" onClick={save}>
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
