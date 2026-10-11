import Graph from "graphology";
import { detectCycles } from "../cycle-detection.service";

function testCycleDetection() {
  // Test 1: A → B → C → A
  const cyclicGraph = new Graph({ type: "directed" });

  cyclicGraph.addNode("A");
  cyclicGraph.addNode("B");
  cyclicGraph.addNode("C");

  cyclicGraph.addEdge("A", "B");
  cyclicGraph.addEdge("B", "C");
  cyclicGraph.addEdge("C", "A");

  const cycles = detectCycles(cyclicGraph);

  console.log("Test 1 - Circular dependency:", cycles.length === 1 ? "PASS" : "FAIL");
  console.log(cycles);

  // Test 2: A → B → C
  const acyclicGraph = new Graph({ type: "directed" });

  acyclicGraph.addNode("A");
  acyclicGraph.addNode("B");
  acyclicGraph.addNode("C");

  acyclicGraph.addEdge("A", "B");
  acyclicGraph.addEdge("B", "C");

  const noCycles = detectCycles(acyclicGraph);

  console.log("Test 2 - Normal dependency chain:", noCycles.length === 0 ? "PASS" : "FAIL");
  console.log(noCycles);

  // Test 3: A → A
  const selfLoopGraph = new Graph({ type: "directed" });

  selfLoopGraph.addNode("A");
  selfLoopGraph.addEdge("A", "A");

  const selfLoopCycles = detectCycles(selfLoopGraph);

  console.log("Test 3 - Self-loop:", selfLoopCycles.length === 1 ? "PASS" : "FAIL");
  console.log(selfLoopCycles);
}

testCycleDetection();
