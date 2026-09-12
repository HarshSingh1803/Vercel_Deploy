import assert from "node:assert/strict";
import { parseCsv, isSocialVideoPage, isDirectVideoUrl } from "../src/lib/workspace/parse";

const rows = parseCsv(`title,url,caption
Launch clip,https://example.com/a.mp4,Hello world
Second,https://instagram.com/reel/abc,Saved locally`);

assert.equal(rows.length, 2);
assert.equal(rows[0].title, "Launch clip");
assert.equal(rows[0].url, "https://example.com/a.mp4");
assert.equal(rows[1].caption, "Saved locally");
assert.equal(isSocialVideoPage("https://www.instagram.com/reel/abc"), true);
assert.equal(isSocialVideoPage("https://youtube.com/watch?v=1"), true);
assert.equal(isSocialVideoPage("https://example.com/video.mp4"), false);
assert.equal(isDirectVideoUrl("https://cdn.example.com/file.mp4"), true);
assert.equal(isDirectVideoUrl("https://instagram.com/reel/abc"), false);

console.log("parse tests passed");
