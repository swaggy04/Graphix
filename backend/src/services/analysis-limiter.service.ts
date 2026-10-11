type Release = () => void;

export class AnalysisLimiter {
  private activeAnalyses = 0;

  constructor(private readonly maxConcurrentAnalyses: number) {}

  tryAcquire(): Release | null {
    if (this.activeAnalyses >= this.maxConcurrentAnalyses) {
      return null;
    }

    this.activeAnalyses += 1;
    let released = false;

    return () => {
      if (released) {
        return;
      }

      released = true;
      this.activeAnalyses -= 1;
    };
  }
}
