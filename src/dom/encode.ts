import {Event, Token} from "@clarity-types/data";
import {INodeData} from "@clarity-types/dom";
import { Metric } from "@clarity-types/metric";
import * as task from "@src/core/task";
import time from "@src/core/time";
import hash from "@src/data/hash";
import {check} from "@src/data/token";
import * as metrics from "@src/metric";

import * as nodes from "./virtualdom";

window["HASH"] = hash;

export default async function(type: Event): Promise<Token[]> {
    let timer = type === Event.Discover ? Metric.DiscoverTime : Metric.MutationTime;
    let tokens: Token[] = [time(), type];
    let values = nodes.summarize();
    for (let value of values) {
        if (task.longtask(timer)) { await task.idle(timer); }
        let metadata = [];
        let layouts = [];
        let data: INodeData = value.data;
        let keys = ["tag", "layout", "attributes", "value"];
        for (let key of keys) {
            if (data[key]) {
                switch (key) {
                    case "tag":
                        metrics.counter(Metric.NodeCount);
                        tokens.push(value.id);
                        if (value.parent) { tokens.push(value.parent); }
                        if (value.next) { tokens.push(value.next); }
                        metadata.push(data[key]);
                        break;
                    case "attributes":
                        for (let attr in data[key]) {
                            if (data[key][attr] !== undefined) {
                                metadata.push(`${attr}=${data[key][attr]}`);
                            }
                        }
                        break;
                    case "layout":
                        if (data[key].length > 0) {
                            let boxes = layout(data[key]);
                            for (let box of boxes) {
                                layouts.push(box);
                            }
                        }
                        break;
                    case "value":
                        let parent = nodes.getNode(value.parent);
                        if (parent === null) {
                            console.warn("Unexpected | Node data: " + JSON.stringify(data));
                        }
                        let parentTag = nodes.get(parent) ? nodes.get(parent).data.tag : null;
                        metadata.push(text(parentTag, data[key]));
                        break;
                }
            }
        }

        // Add metadata
        metadata = meta(metadata);
        for (let token of metadata) {
            let index: number = typeof token === "string" ? tokens.indexOf(token) : -1;
            tokens.push(index >= 0 && token.length > index.toString().length ? [index] : token);
        }
        // Add layout boxes
        for (let entry of layouts) {
            tokens.push(entry);
        }
    }
    return tokens;
}

function meta(metadata: string[]): string[] | string[][] {
    let value = JSON.stringify(metadata);
    let hashed = hash(value);
    return check(hashed) && hashed.length < value.length ? [[hashed]] : metadata;
}

function text(tag: string, value: string): string {
    switch (tag) {
        case "STYLE":
        case "TITLE":
            return value;
        default:
            return value;
            let wasWhiteSpace = false;
            let textCount = 0;
            let wordCount = 0;
            for (let i = 0; i < value.length; i++) {
                let code = value.charCodeAt(i);
                let isWhiteSpace = (code === 32 || code === 10 || code === 9 || code === 13);
                textCount += isWhiteSpace ? 0 : 1;
                wordCount += isWhiteSpace && !wasWhiteSpace ? 1 : 0;
                wasWhiteSpace = isWhiteSpace;
            }
            return `${textCount.toString(36)}*${wordCount.toString(36)}`;
    }
}

function layout(l: number[]): string[] {
    let output = [];
    for (let i = 0; i < l.length; i = i + 4) {
        output.push([l[i + 0].toString(36), l[i + 1].toString(36), l[i + 2].toString(36), l[i + 3].toString(36)].join("*"));
    }
    return output;
}
