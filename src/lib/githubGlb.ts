export type GithubGlb = {
  id: string;
  name: string;
  path: string;
  downloadUrl: string; // URL để tải (private: dùng Contents API)
  isPrivate: boolean;
};

async function getRepoMeta(owner: string, repo: string, token?: string) {
  const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(token ? { Authorization: `token ${token}` } : {}),
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!r.ok) throw new Error(`Repo meta ${r.status}: ${await r.text()}`);
  return r.json() as Promise<{ private: boolean; default_branch: string }>;
}

/** Liệt kê .glb trong repo (public/private). Với private trả URL Contents API. */
export async function listGlbFilesFromGithub(opts: {
  owner: string;
  repo: string;
  branch?: string; // nếu bỏ trống sẽ lấy default_branch
  pathPrefix?: string; // "" = quét toàn bộ
  token?: string; // private/public đều nên truyền để tăng rate limit
}): Promise<GithubGlb[]> {
  const { owner, repo, token } = opts;
  const meta = await getRepoMeta(owner, repo, token);
  const branch = opts.branch || meta.default_branch;
  const pp = (opts.pathPrefix || "").replace(/^\/+|\/+$/g, ""); // normalize

  const api = `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(
    branch
  )}?recursive=1`;
  const res = await fetch(api, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(token ? { Authorization: `token ${token}` } : {}),
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) throw new Error(`Git Trees ${res.status}: ${await res.text()}`);
  const data = await res.json();

  if (data.truncated) {
    console.warn(
      "Git Trees truncated=true → có thể thiếu file. Hãy dùng pathPrefix nhỏ hơn hoặc duyệt Contents API theo thư mục."
    );
  }

  const files: GithubGlb[] = (data?.tree || [])
    .filter(
      (n: any) =>
        n.type === "blob" &&
        typeof n.path === "string" &&
        n.path.toLowerCase().endsWith(".glb") &&
        (pp ? n.path.startsWith(pp + "/") || n.path === pp : true)
    )
    .map((n: any) => {
      // Với private: dùng Contents API URL (cần kèm header khi fetch)
      // Với public: có thể dùng raw.githubusercontent.com
      const encodedPath = (n.path as string)
        .split("/")
        .map((seg) => encodeURIComponent(seg))
        .join("/");

      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(
        branch
      )}/${encodedPath}`;
      const contentsApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(
        branch
      )}`;

      return {
        id: n.sha,
        name: n.path.split("/").pop() as string,
        path: n.path,
        downloadUrl: meta.private ? contentsApiUrl : rawUrl,
        isPrivate: meta.private,
      };
    });

  return files;
}
