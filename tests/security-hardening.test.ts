import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRobustJson } from "../src/lib/robust-json.ts";
import { isSupportedImage, isSupportedVideo } from "../src/lib/upload-validation.ts";

test("robust JSON parses plain, fenced, embedded, and trailing-comma JSON without eval", () => {
  assert.deepEqual(parseRobustJson('{"id":"abc"}'), { id: "abc" });
  assert.deepEqual(parseRobustJson('```json\n{"id":"abc",}\n```'), { id: "abc" });
  assert.deepEqual(parseRobustJson('Worker response: {"id":"abc","note":"brace } inside","items":[1,{"x":2}]} done'), { id: "abc", note: "brace } inside", items: [1, { x: 2 }] });
  assert.throws(() => parseRobustJson('not JSON; process.exit(1)'));
});

test("image uploads require a known binary signature", () => {
  assert.equal(isSupportedImage(Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0])), true);
  assert.equal(isSupportedImage(new TextEncoder().encode("<script>alert(1)</script>")), false);
  assert.equal(isSupportedImage(new Uint8Array([0xff,0xd8,0xff])), false); // truncated signature
});

test("video uploads require MP4/MOV or WebM container signatures", () => {
  assert.equal(isSupportedVideo(Uint8Array.from([0,0,0,24,0x66,0x74,0x79,0x70,0x69,0x73,0x6f,0x6d])), true);
  assert.equal(isSupportedVideo(Uint8Array.from([0x1a,0x45,0xdf,0xa3,0x93,0x42,0x82,0x88,0x77,0x65,0x62,0x6d])), true);
  assert.equal(isSupportedVideo(new TextEncoder().encode("this says video/mp4 but is not one")), false);
});
