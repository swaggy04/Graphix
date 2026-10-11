import Graph from "graphology";
import { stronglyConnectedComponents } from "graphology-components";
export function detectCycles(graph:Graph):string[][] {
  const components = stronglyConnectedComponents(graph)
  return components.filter((component) => {
    if (component.length > 1) {
        return true;
      }
  
      const node = component[0];
  
      return node !== undefined && graph.hasEdge(node, node);
  })
}