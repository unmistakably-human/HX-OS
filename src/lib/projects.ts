import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { Project, Feature, Concept } from "./types";

const DATA_DIR = path.join(process.cwd(), "data", "projects");

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function projectDir(id: string) {
  return path.join(DATA_DIR, id);
}

function projectFile(id: string) {
  return path.join(projectDir(id), "project.json");
}

export async function createProject(name: string): Promise<Project> {
  const id = randomUUID();
  const project: Project = {
    id,
    name,
    createdAt: new Date().toISOString(),
    productContext: null,
    enrichedPcd: null,
    discoveryInsights: null,
    features: {},
    phases: {
      context: "active",
      discovery: "locked",
      features: "locked",
      concepts: "locked",
    },
  };
  await ensureDir(projectDir(id));
  await fs.writeFile(projectFile(id), JSON.stringify(project, null, 2));
  return project;
}

export async function getProject(id: string): Promise<Project> {
  const raw = await fs.readFile(projectFile(id), "utf-8");
  return JSON.parse(raw);
}

export async function updateProject(
  id: string,
  updates: Partial<Project>
): Promise<Project> {
  const project = await getProject(id);
  const merged = { ...project, ...updates };
  await fs.writeFile(projectFile(id), JSON.stringify(merged, null, 2));
  return merged;
}

export async function listProjects(): Promise<Project[]> {
  await ensureDir(DATA_DIR);
  const dirs = await fs.readdir(DATA_DIR, { withFileTypes: true });
  const projects: Project[] = [];
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    try {
      const p = await getProject(d.name);
      projects.push(p);
    } catch {
      // skip broken entries
    }
  }
  return projects;
}

export async function saveDiscovery(
  id: string,
  insights: string
): Promise<void> {
  const dir = projectDir(id);
  await fs.writeFile(path.join(dir, "discovery.json"), JSON.stringify({ insights }, null, 2));
  await updateProject(id, {
    discoveryInsights: insights,
    phases: {
      context: "complete",
      discovery: "complete",
      features: "active",
      concepts: "locked",
    },
  } as Partial<Project>);
}

export async function createFeature(
  projectId: string,
  feature: Omit<Feature, "id">
): Promise<Feature> {
  const id = randomUUID().slice(0, 8);
  const full: Feature = { id, ...feature };
  const project = await getProject(projectId);
  project.features[id] = full;
  await updateProject(projectId, { features: project.features });
  return full;
}

export async function getFeature(
  projectId: string,
  featureId: string
): Promise<Feature> {
  const project = await getProject(projectId);
  const feature = project.features[featureId];
  if (!feature) throw new Error(`Feature ${featureId} not found`);
  return feature;
}

export async function updateFeature(
  projectId: string,
  featureId: string,
  updates: Partial<Feature>
): Promise<void> {
  const project = await getProject(projectId);
  const feature = project.features[featureId];
  if (!feature) throw new Error(`Feature ${featureId} not found`);
  project.features[featureId] = { ...feature, ...updates };
  await updateProject(projectId, { features: project.features });
}

export async function saveConcepts(
  projectId: string,
  featureId: string,
  concepts: Concept[]
): Promise<void> {
  const dir = projectDir(projectId);
  await fs.writeFile(
    path.join(dir, `concepts-${featureId}.json`),
    JSON.stringify(concepts, null, 2)
  );
}
