const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

// ✅ APNI DETAILS YAHAN BHARO
const USER_ID = "Harshraj_18062005";       
const EMAIL_ID = "harsh0764.be23@chitkara.edu.in";          // college email
const ROLL_NUMBER = "2310990764";           // college roll number

function isValidEntry(entry) {
  const trimmed = entry.trim();
  const regex = /^([A-Z])->([A-Z])$/;
  return regex.test(trimmed) ? trimmed : null;
}

function buildHierarchies(validEdges) {
  const children = {}; // parent -> [child]
  const parentOf = {}; // child -> parent (first seen)
  const allNodes = new Set();

  for (const edge of validEdges) {
    const [p, c] = edge.split("->");
    allNodes.add(p);
    allNodes.add(c);

    if (!children[p]) children[p] = [];

    // Diamond: if child already has a parent, discard
    if (parentOf[c] !== undefined) continue;

    parentOf[c] = p;
    children[p].push(c);
  }

  // Find all roots (nodes that are never a child)
  const roots = [...allNodes].filter((n) => parentOf[n] === undefined);

  // Group nodes by connected component
  function getComponent(start) {
    const visited = new Set();
    const stack = [start];
    while (stack.length) {
      const node = stack.pop();
      if (visited.has(node)) continue;
      visited.add(node);
      (children[node] || []).forEach((c) => stack.push(c));
      // also go upward
    }
    return visited;
  }

  // Better: union-find for components
  const parent = {};
  [...allNodes].forEach((n) => (parent[n] = n));

  function find(x) {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }
  function union(a, b) {
    parent[find(a)] = find(b);
  }

  for (const edge of validEdges) {
    const [p, c] = edge.split("->");
    union(p, c);
  }

  // Group by component
  const components = {};
  for (const node of allNodes) {
    const root = find(node);
    if (!components[root]) components[root] = new Set();
    components[root].add(node);
  }

  const hierarchies = [];

  for (const compKey of Object.keys(components)) {
    const nodes = components[compKey];

    // Find root of this component
    const compRoots = [...nodes].filter((n) => parentOf[n] === undefined);
    let rootNode;
    if (compRoots.length > 0) {
      rootNode = compRoots.sort()[0]; // lexicographically smallest root
    } else {
      // Pure cycle — no root, pick lex smallest
      rootNode = [...nodes].sort()[0];
    }

    // Cycle detection using DFS
    function hasCycle(node, visited, recStack) {
      visited.add(node);
      recStack.add(node);
      for (const child of children[node] || []) {
        if (!visited.has(child)) {
          if (hasCycle(child, visited, recStack)) return true;
        } else if (recStack.has(child)) {
          return true;
        }
      }
      recStack.delete(node);
      return false;
    }

    let cycleFound = false;
    const vis = new Set();
    for (const node of nodes) {
      if (!vis.has(node)) {
        if (hasCycle(node, vis, new Set())) {
          cycleFound = true;
          break;
        }
      }
    }

    if (cycleFound) {
      hierarchies.push({ root: rootNode, tree: {}, has_cycle: true });
    } else {
      // Build nested tree
      function buildTree(node) {
        const obj = {};
        for (const child of children[node] || []) {
          obj[child] = buildTree(child);
        }
        return obj;
      }

      // Depth = longest root-to-leaf path (node count)
      function getDepth(node) {
        const kids = children[node] || [];
        if (kids.length === 0) return 1;
        return 1 + Math.max(...kids.map(getDepth));
      }

      const tree = { [rootNode]: buildTree(rootNode) };
      const depth = getDepth(rootNode);
      hierarchies.push({ root: rootNode, tree, depth });
    }
  }

  return hierarchies;
}

app.post("/bfhl", (req, res) => {
  const data = req.body.data || [];

  const invalidEntries = [];
  const seenEdges = new Set();
  const duplicateEdges = [];
  const validEdges = [];

  for (const raw of data) {
    const trimmed = typeof raw === "string" ? raw.trim() : "";
    const regex = /^([A-Z])->([A-Z])$/;

    if (!regex.test(trimmed)) {
      invalidEntries.push(raw); // push original
      continue;
    }

    // Self-loop check
    const [p, c] = trimmed.split("->");
    if (p === c) {
      invalidEntries.push(raw);
      continue;
    }

    if (seenEdges.has(trimmed)) {
      if (!duplicateEdges.includes(trimmed)) {
        duplicateEdges.push(trimmed);
      }
    } else {
      seenEdges.add(trimmed);
      validEdges.push(trimmed);
    }
  }

  const hierarchies = buildHierarchies(validEdges);

  // Summary
  const nonCyclic = hierarchies.filter((h) => !h.has_cycle);
  const cyclic = hierarchies.filter((h) => h.has_cycle);

  let largest_tree_root = "";
  if (nonCyclic.length > 0) {
    const sorted = [...nonCyclic].sort((a, b) => {
      if (b.depth !== a.depth) return b.depth - a.depth;
      return a.root < b.root ? -1 : 1;
    });
    largest_tree_root = sorted[0].root;
  }

  res.json({
    user_id: USER_ID,
    email_id: EMAIL_ID,
    college_roll_number: ROLL_NUMBER,
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary: {
      total_trees: nonCyclic.length,
      total_cycles: cyclic.length,
      largest_tree_root,
    },
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));