/**
 * algorithms.js
 * Accurate implementations of FIFO, LRU, and Optimal page replacement algorithms.
 * Each function returns a full step-by-step trace for visualization.
 */

/** 
 * Parse a reference string into an array of integers.
 */
function parseRefString(str) {
  if (!/^[0-9\s]+$/.test(str)) {
  alert("Only numbers (0-9) allowed!");
  return [];
  }
  return str.trim().split(/\s+/).map(Number).filter(n => !isNaN(n));
}

/**
 * FIFO - First In First Out
 * Maintains a queue; the page at the front (oldest) is evicted first.
 * Returns: { steps, faults, hits }
 */
function runFIFO(refString, numFrames) {
  const pages = parseRefString(refString);
  const frames = [];   // current frame contents
  const queue = [];    // FIFO order (oldest page at index 0)
  const steps = [];
  let faults = 0, hits = 0;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const framesBefore = [...frames];
    let isFault = false;
    let evicted = null;

    if (frames.includes(page)) {
      // PAGE HIT
      hits++;
      isFault = false;
    } else {
      // PAGE FAULT
      faults++;
      isFault = true;

      if (frames.length < numFrames) {
        // Frame available — just add
        frames.push(page);
        queue.push(page);
      } else {
        // Evict oldest (FIFO front)
        evicted = queue.shift();
        const idx = frames.indexOf(evicted);
        frames[idx] = page;
        queue.push(page);
      }
    }

    steps.push({
      step: i + 1,
      page,
      frames: [...frames],
      framesBefore,
      isFault,
      evicted,
      queueState: [...queue],
      runningFaults: faults,
      runningHits: hits,
    });
  }

  return { steps, faults, hits, total: pages.length };
}

/**
 * LRU - Least Recently Used
 * Evicts the page that was used furthest in the past.
 * Uses a usage order array (most recent at end).
 * Returns: { steps, faults, hits }
 */
function runLRU(refString, numFrames) {
  const pages = parseRefString(refString);
  const frames = [];
  const usageOrder = []; // tracks recency; most recent at end
  const steps = [];
  let faults = 0, hits = 0;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const framesBefore = [...frames];
    let isFault = false;
    let evicted = null;

    if (frames.includes(page)) {
      // PAGE HIT — update recency
      hits++;
      isFault = false;
      const idx = usageOrder.indexOf(page);
      usageOrder.splice(idx, 1);
      usageOrder.push(page);
    } else {
      // PAGE FAULT
      faults++;
      isFault = true;

      if (frames.length < numFrames) {
        frames.push(page);
        usageOrder.push(page);
      } else {
        // Evict least recently used (front of usageOrder)
        evicted = usageOrder.shift();
        const idx = frames.indexOf(evicted);
        frames[idx] = page;
        usageOrder.push(page);
      }
    }

    steps.push({
      step: i + 1,
      page,
      frames: [...frames],
      framesBefore,
      isFault,
      evicted,
      usageOrder: [...usageOrder],
      runningFaults: faults,
      runningHits: hits,
    });
  }

  return { steps, faults, hits, total: pages.length };
}

/**
 * Optimal (Bélády's Algorithm)
 * Evicts the page that will not be used for the longest time in the future.
 * This is the theoretically optimal algorithm — requires knowing future references.
 * Returns: { steps, faults, hits }
 */
function runOptimal(refString, numFrames) {
  const pages = parseRefString(refString);
  const frames = [];
  const steps = [];
  let faults = 0, hits = 0;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const framesBefore = [...frames];
    let isFault = false;
    let evicted = null;

    if (frames.includes(page)) {
      // PAGE HIT
      hits++;
      isFault = false;
    } else {
      // PAGE FAULT
      faults++;
      isFault = true;

      if (frames.length < numFrames) {
        frames.push(page);
      } else {
        // Find next use of each frame page in future references
        const futureUse = frames.map(fp => {
          const nextUse = pages.indexOf(fp, i + 1);
          return nextUse === -1 ? Infinity : nextUse;
        });

        // Evict page with farthest (or no) future use
        const evictIdx = futureUse.indexOf(Math.max(...futureUse));
        evicted = frames[evictIdx];
        frames[evictIdx] = page;
      }
    }

    steps.push({
      step: i + 1,
      page,
      frames: [...frames],
      framesBefore,
      isFault,
      evicted,
      futureRef: getFutureRefs(pages, frames, i),
      runningFaults: faults,
      runningHits: hits,
    });
  }

  return { steps, faults, hits, total: pages.length };
}

/**
 * Helper: get next reference index for each page in frames (for Optimal display)
 */
function getFutureRefs(pages, frames, currentIdx) {
  const result = {};
  for (const fp of frames) {
    const next = pages.indexOf(fp, currentIdx + 1);
    result[fp] = next === -1 ? '∞' : next + 1;
  }
  return result;
}

/**
 * Run all three algorithms on the same input for comparison.
 */
function runAllAlgorithms(refString, numFrames) {
  return {
    FIFO: runFIFO(refString, numFrames),
    LRU: runLRU(refString, numFrames),
    OPT: runOptimal(refString, numFrames),
  };
}

/**
 * Theory data for modal display
 */
const THEORY_DATA = {
  fifo: {
    title: 'FIFO — First In First Out',
    tag: 'algo-fifo',
    tagLabel: 'FIFO',
    content: `
      <p>FIFO is the simplest page replacement algorithm. It maintains a queue of pages in memory. When a page fault occurs and all frames are full, the page that has been in memory the longest (i.e., the front of the queue) is evicted.</p>
      <p><strong>How it works:</strong></p>
      <ul>
        <li>Maintain a FIFO queue of loaded pages.</li>
        <li>On a page hit: do nothing to the queue.</li>
        <li>On a page fault with free frames: add the page to the queue.</li>
        <li>On a page fault with all frames full: dequeue the oldest page, load the new page.</li>
      </ul>
      <p><strong>Bélády's Anomaly:</strong> FIFO can suffer from <code>Bélády's Anomaly</code> — increasing the number of frames can sometimes <em>increase</em> the number of page faults. This is a unique and counterintuitive property.</p>
      <p><strong>Complexity:</strong> O(1) per reference. <strong>Advantage:</strong> Simple, low overhead. <strong>Disadvantage:</strong> Doesn't consider frequency or recency of use.</p>
      <div class="modal-example">
        <div class="modal-example-title">// Example: Ref string = 1 2 3 4 1 2 5, Frames = 3</div>
        <p style="font-family:var(--mono);font-size:12px;color:#8fa8a8">
          1→ [1] FAULT &nbsp;|&nbsp; 2→ [1,2] FAULT &nbsp;|&nbsp; 3→ [1,2,3] FAULT<br/>
          4→ evict 1 → [2,3,4] FAULT &nbsp;|&nbsp; 1→ evict 2 → [3,4,1] FAULT<br/>
          2→ evict 3 → [4,1,2] FAULT &nbsp;|&nbsp; 5→ evict 4 → [1,2,5] FAULT<br/>
          Total faults: 7
        </p>
      </div>
    `
  },
  lru: {
    title: 'LRU — Least Recently Used',
    tag: 'algo-lru',
    tagLabel: 'LRU',
    content: `
      <p>LRU evicts the page that was least recently accessed. It uses the principle of <strong>temporal locality</strong> — if a page was recently used, it is likely to be used again soon.</p>
      <p><strong>How it works:</strong></p>
      <ul>
        <li>Maintain a usage-order list (most recently used at end).</li>
        <li>On a page hit: move that page to the end of the list (most recent).</li>
        <li>On a page fault with all frames full: evict the page at the front (least recent).</li>
      </ul>
      <p><strong>Approximation in real OS:</strong> True LRU requires hardware support (reference bits or timestamps). Most operating systems use approximations like the <code>Clock (Second-Chance)</code> algorithm or <code>NFU (Not Frequently Used)</code>.</p>
      <p><strong>Advantage:</strong> Good performance in practice, exploits temporal locality. <strong>Disadvantage:</strong> Higher overhead than FIFO. Does <em>not</em> suffer from Bélády's Anomaly.</p>
      <div class="modal-example">
        <div class="modal-example-title">// Example: Ref string = 1 2 3 4 1 2 5, Frames = 3</div>
        <p style="font-family:var(--mono);font-size:12px;color:#8fa8a8">
          1→ [1] FAULT &nbsp;|&nbsp; 2→ [1,2] FAULT &nbsp;|&nbsp; 3→ [1,2,3] FAULT<br/>
          4→ evict 1(LRU) → [2,3,4] FAULT &nbsp;|&nbsp; 1→ evict 2 → [3,4,1] FAULT<br/>
          2→ evict 3 → [4,1,2] FAULT &nbsp;|&nbsp; 5→ evict 4 → [1,2,5] FAULT<br/>
          Total faults: 7
        </p>
      </div>
    `
  },
  opt: {
    title: 'Optimal (Bélády\'s Algorithm)',
    tag: 'algo-opt',
    tagLabel: 'OPT',
    content: `
      <p>The Optimal algorithm, proposed by László Bélády in 1966, provides a theoretical lower bound on page faults. It evicts the page that will not be used for the longest period in the future.</p>
      <p><strong>How it works:</strong></p>
      <ul>
        <li>On a page fault with all frames full, look ahead in the reference string.</li>
        <li>For each page currently in memory, find its next occurrence in the future.</li>
        <li>Evict the page with the farthest (or no) future reference — it is the "least useful" page.</li>
      </ul>
      <p><strong>Why it's theoretical:</strong> In a real OS, future page references are not known at the time of a fault. Optimal is used as a <em>benchmark</em> to evaluate how close practical algorithms come to the ideal.</p>
      <p><strong>Advantage:</strong> Minimum possible page faults — the gold standard. <strong>Disadvantage:</strong> Not implementable in real systems. Does not suffer from Bélády's Anomaly.</p>
      <div class="modal-example">
        <div class="modal-example-title">// Example: Ref string = 1 2 3 4 1 2 5, Frames = 3</div>
        <p style="font-family:var(--mono);font-size:12px;color:#8fa8a8">
          1→ [1] FAULT &nbsp;|&nbsp; 2→ [1,2] FAULT &nbsp;|&nbsp; 3→ [1,2,3] FAULT<br/>
          4→ evict 3(used last) → [1,2,4] FAULT &nbsp;|&nbsp; 1→ [1,2,4] HIT<br/>
          2→ [1,2,4] HIT &nbsp;|&nbsp; 5→ evict 4 → [1,2,5] FAULT<br/>
          Total faults: 5 (optimal minimum)
        </p>
      </div>
    `
  }
};

