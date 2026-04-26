import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

export const OUTPUT_DIRECTORY = "release";
export const RELEASE_NOTES_DIRECTORY = "release-metadata";
export const RELEASE_NOTES_FILE = "release-notes.json";
export const RELEASE_ASSET_CONTENT_TYPE = "application/octet-stream";

export function resolveOutputDirectory() {
  return process.env.FISHMARK_RELEASE_DIR?.trim() || OUTPUT_DIRECTORY;
}

export function parseJson(source, label) {
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`Failed to parse ${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function loadJson(filePath, label) {
  const source = await readFile(filePath, "utf8");
  return parseJson(source, label);
}

export async function cleanOutputDirectory(projectDir, outputDirectory = OUTPUT_DIRECTORY) {
  const resolvedOutputDirectory = path.join(projectDir, outputDirectory);
  const normalized = path.resolve(resolvedOutputDirectory);

  if (normalized !== resolvedOutputDirectory) {
    throw new Error(`Unexpected output directory: ${normalized}`);
  }

  await rm(normalized, { recursive: true, force: true });
}

function resolveReleaseNotesPath(projectDir) {
  return path.join(projectDir, RELEASE_NOTES_DIRECTORY, RELEASE_NOTES_FILE);
}

function validateReleaseNotesShape(releaseNotes, version) {
  if (!releaseNotes || typeof releaseNotes !== "object") {
    throw new Error(`${RELEASE_NOTES_DIRECTORY}/${RELEASE_NOTES_FILE} must contain a JSON object.`);
  }

  const parsedVersion =
    typeof releaseNotes.version === "string" && releaseNotes.version.trim().length > 0
      ? releaseNotes.version.trim()
      : null;
  const title =
    typeof releaseNotes.title === "string" && releaseNotes.title.trim().length > 0
      ? releaseNotes.title.trim()
      : null;
  const body =
    typeof releaseNotes.body === "string" && releaseNotes.body.trim().length > 0 ? releaseNotes.body : null;

  if (!parsedVersion || !title || !body) {
    throw new Error(
      `${RELEASE_NOTES_DIRECTORY}/${RELEASE_NOTES_FILE} must define non-empty version, title, and body fields.`
    );
  }

  if (parsedVersion !== version) {
    throw new Error(
      `Release notes version ${parsedVersion} does not match package.json version ${version}.`
    );
  }

  return {
    version: parsedVersion,
    title,
    body
  };
}

export async function loadReleaseNotes({ projectDir, version }) {
  const releaseNotesPath = resolveReleaseNotesPath(projectDir);
  let source;

  try {
    source = await readFile(releaseNotesPath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw new Error(`Missing release notes metadata: ${RELEASE_NOTES_DIRECTORY}/${RELEASE_NOTES_FILE}`);
    }

    throw error;
  }

  const releaseNotes = parseJson(source, `${RELEASE_NOTES_DIRECTORY}/${RELEASE_NOTES_FILE}`);
  return validateReleaseNotesShape(releaseNotes, version);
}

export function resolveGitHubToken({ env = process.env, spawnSyncImpl = spawnSync } = {}) {
  const directToken = env.GH_TOKEN ?? env.GITHUB_TOKEN;

  if (directToken && directToken.trim().length > 0) {
    return directToken.trim();
  }

  const credentialResult = spawnSyncImpl("git", ["credential", "fill"], {
    input: "protocol=https\nhost=github.com\n\n",
    encoding: "utf8",
    env: {
      ...env,
      GIT_TERMINAL_PROMPT: "0"
    }
  });

  if (credentialResult.status === 0) {
    const passwordLine = credentialResult.stdout
      .split(/\r?\n/u)
      .find((line) => line.startsWith("password="));

    if (passwordLine) {
      return passwordLine.slice("password=".length);
    }
  }

  const ghTokenResult = spawnSyncImpl("gh", ["auth", "token"], {
    encoding: "utf8",
    env: {
      ...env,
      GIT_TERMINAL_PROMPT: "0"
    }
  });

  if (ghTokenResult.status === 0 && ghTokenResult.stdout?.trim()) {
    return ghTokenResult.stdout.trim();
  }

  throw new Error(
    `Unable to resolve GitHub credentials: ${
      credentialResult.stderr?.trim() ||
      credentialResult.stdout?.trim() ||
      ghTokenResult.stderr?.trim() ||
      ghTokenResult.stdout?.trim() ||
      "set GH_TOKEN/GITHUB_TOKEN, configure git credentials, or run gh auth login"
    }`
  );
}

export function resolveGithubPublishConfig(builderConfig) {
  const publishEntries = Array.isArray(builderConfig.publish) ? builderConfig.publish : [];
  const githubConfig = publishEntries.find(
    (entry) => entry && typeof entry === "object" && entry.provider === "github"
  );

  if (!githubConfig?.owner || !githubConfig?.repo) {
    throw new Error("electron-builder.json must define a GitHub publish owner/repo.");
  }

  return githubConfig;
}

export async function githubRequest(url, init) {
  const response = await fetch(url, init);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API request failed (${response.status} ${response.statusText}): ${body}`);
  }

  return response;
}

export async function getReleaseByTag({ owner, repo, tagName, token, userAgent = "FishMark-Release" }) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${tagName}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": userAgent
    }
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to query release ${tagName}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function buildReleasePayload({ version, releaseNotes, releaseOptions = {} }) {
  return {
    tag_name: releaseOptions.tagName ?? `v${version}`,
    target_commitish: "main",
    name: releaseOptions.name ?? releaseNotes.title,
    body: releaseOptions.body ?? releaseNotes.body,
    draft: false,
    prerelease: releaseOptions.prerelease ?? false,
    generate_release_notes: false
  };
}

export async function ensureRelease({
  owner,
  repo,
  version,
  token,
  releaseNotes,
  userAgent = "FishMark-Release",
  releaseOptions = {}
}) {
  const tagName = releaseOptions.tagName ?? `v${version}`;
  const existing = await getReleaseByTag({ owner, repo, tagName, token, userAgent });
  const releasePayload = buildReleasePayload({ version, releaseNotes, releaseOptions });

  if (existing) {
    const updateUrl =
      typeof existing.url === "string"
        ? existing.url
        : `https://api.github.com/repos/${owner}/${repo}/releases/${existing.id}`;

    const response = await githubRequest(updateUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": userAgent
      },
      body: JSON.stringify({
        name: releasePayload.name,
        body: releasePayload.body,
        draft: releasePayload.draft,
        prerelease: releasePayload.prerelease,
        make_latest: releaseOptions.makeLatest === false ? "false" : "true"
      })
    });

    return response.json();
  }

  const response = await githubRequest(`https://api.github.com/repos/${owner}/${repo}/releases`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": userAgent
    },
    body: JSON.stringify(releasePayload)
  });

  return response.json();
}

export async function deleteExistingAssets({ owner, repo, release, assetNames, token, userAgent = "FishMark-Release" }) {
  const assets = Array.isArray(release.assets) ? release.assets : [];

  for (const asset of assets) {
    if (!assetNames.includes(asset.name)) {
      continue;
    }

    await githubRequest(`https://api.github.com/repos/${owner}/${repo}/releases/assets/${asset.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": userAgent
      }
    });
  }
}

export async function uploadReleaseAsset(uploadBaseUrl, assetPath, assetName, token, userAgent = "FishMark-Release") {
  const content = await readFile(assetPath);

  const response = await githubRequest(`${uploadBaseUrl}?name=${encodeURIComponent(assetName)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": RELEASE_ASSET_CONTENT_TYPE,
      "Content-Length": String(content.length),
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": userAgent
    },
    body: content
  });

  await response.text();
}

export async function publishReleaseAssets({
  builderConfig,
  projectDir,
  version,
  assets,
  userAgent = "FishMark-Release",
  releaseOptions = {}
}) {
  const githubConfig = resolveGithubPublishConfig(builderConfig);
  const token = resolveGitHubToken();
  const releaseNotes = await loadReleaseNotes({ projectDir, version });
  const release = await ensureRelease({
    owner: githubConfig.owner,
    repo: githubConfig.repo,
    version,
    token,
    releaseNotes,
    userAgent,
    releaseOptions
  });

  for (const asset of assets) {
    if (!existsSync(asset.filePath)) {
      throw new Error(`Release artifact is missing: ${asset.filePath}`);
    }
  }

  await deleteExistingAssets({
    owner: githubConfig.owner,
    repo: githubConfig.repo,
    release,
    assetNames: assets.map((asset) => asset.name),
    token,
    userAgent
  });

  const uploadBaseUrl = String(release.upload_url).split("{", 1)[0];

  for (const asset of assets) {
    await uploadReleaseAsset(uploadBaseUrl, asset.filePath, asset.name, token, userAgent);
    console.log(`Uploaded ${asset.name}`);
  }

  console.log(`Published GitHub Release: ${release.html_url}`);
}
