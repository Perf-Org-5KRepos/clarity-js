import { Event, Token } from "@clarity-types/data";
import { Timer } from "@clarity-types/metrics";
import queue from "@src/core/queue";
import * as task from "@src/core/task";
import time from "@src/core/time";
import encode from "@src/dom/encode";
import processNode from "./node";

export function start(): void {
    discover().then((data: Token[]) => {
        queue(time(), Event.Discover, data);
      });
}

async function discover(): Promise<Token[]> {
    let timer = Timer.Discover;
    task.start(timer);
    let walker = document.createTreeWalker(document, NodeFilter.SHOW_ALL, null, false);
    let node = walker.nextNode();
    while (node) {
        if (task.longtask(timer)) { await task.idle(timer); }
        processNode(node);
        node = walker.nextNode();
    }
    let data = await encode(timer);
    task.stop(timer);
    return data;
}
