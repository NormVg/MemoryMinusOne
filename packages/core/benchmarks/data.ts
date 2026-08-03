const subjects = ["Alice", "Bob", "Charlie", "Diana", "The company", "The project", "The AI", "The database", "The user"];
const predicates = ["likes", "hates", "bought", "visited", "created", "destroyed", "thinks about", "wants", "needs"];
const objects = ["apples", "bananas", "a new car", "the supermarket", "a revolutionary algorithm", "a bug", "coffee", "more time", "sleep"];

export function generateDummyData(count: number): string[] {
  const data: string[] = [];
  for (let i = 0; i < count; i++) {
    const s = subjects[Math.floor(Math.random() * subjects.length)];
    const p = predicates[Math.floor(Math.random() * predicates.length)];
    const o = objects[Math.floor(Math.random() * objects.length)];
    
    // Add some random filler words to make sentences longer
    const filler = Math.random() > 0.5 ? " yesterday." : " with great enthusiasm.";
    
    data.push(`${s} ${p} ${o}${filler}`);
  }
  return data;
}
