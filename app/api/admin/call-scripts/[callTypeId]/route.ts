import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type ScriptNodeInput = {
  id?: string;
  title?: string;
  body?: string;
  nodeType?: "STEP" | "OUTCOME";
  isEntry?: boolean;
  sortOrder?: number;
};

type ScriptEdgeInput = {
  id?: string;
  fromNodeId?: string;
  choiceKey?: string;
  choiceLabel?: string;
  toNodeId?: string | null;
  sortOrder?: number;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ callTypeId: string }> }
) {
  const { callTypeId } = await params;
  const callType = await prisma.callType.findUnique({
    where: { id: callTypeId },
    include: {
      scriptNodes: {
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
        include: {
          edgesFrom: {
            orderBy: [{ sortOrder: "asc" }, { choiceKey: "asc" }],
          },
        },
      },
    },
  });

  if (!callType) {
    return NextResponse.json({ error: "Call type not found" }, { status: 404 });
  }
  return NextResponse.json(callType);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ callTypeId: string }> }
) {
  const { callTypeId } = await params;
  const body = await request.json();
  const nodes = Array.isArray(body?.nodes) ? (body.nodes as ScriptNodeInput[]) : [];
  const edges = Array.isArray(body?.edges) ? (body.edges as ScriptEdgeInput[]) : [];

  const existing = await prisma.callType.findUnique({
    where: { id: callTypeId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Call type not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.callScriptEdge.deleteMany({
      where: { fromNode: { callTypeId } },
    });
    await tx.callScriptNode.deleteMany({
      where: { callTypeId },
    });

    const idMap = new Map<string, string>();
    for (let i = 0; i < nodes.length; i += 1) {
      const n = nodes[i];
      const created = await tx.callScriptNode.create({
        data: {
          callTypeId,
          title: typeof n.title === "string" && n.title.trim() ? n.title.trim() : `ステップ ${i + 1}`,
          body: typeof n.body === "string" ? n.body.trim() : "",
          nodeType: n.nodeType === "OUTCOME" ? "OUTCOME" : "STEP",
          isEntry: Boolean(n.isEntry),
          sortOrder: typeof n.sortOrder === "number" ? n.sortOrder : i,
        },
      });
      if (n.id) idMap.set(n.id, created.id);
    }

    for (let i = 0; i < edges.length; i += 1) {
      const e = edges[i];
      const fromNodeId = e.fromNodeId ? idMap.get(e.fromNodeId) : null;
      if (!fromNodeId) continue;
      const toNodeId = e.toNodeId ? (idMap.get(e.toNodeId) ?? null) : null;
      await tx.callScriptEdge.create({
        data: {
          fromNodeId,
          toNodeId,
          choiceKey: typeof e.choiceKey === "string" && e.choiceKey.trim() ? e.choiceKey.trim() : `CHOICE_${i + 1}`,
          choiceLabel: typeof e.choiceLabel === "string" ? e.choiceLabel.trim() || null : null,
          sortOrder: typeof e.sortOrder === "number" ? e.sortOrder : i,
        },
      });
    }
  });

  const updated = await prisma.callType.findUnique({
    where: { id: callTypeId },
    include: {
      scriptNodes: {
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
        include: { edgesFrom: { orderBy: [{ sortOrder: "asc" }, { choiceKey: "asc" }] } },
      },
    },
  });

  return NextResponse.json(updated);
}
