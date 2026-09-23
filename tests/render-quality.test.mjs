import test from 'node:test';
import assert from 'node:assert/strict';
import { selectPixelRatios } from '../js/museum/render-quality.js';
import { createPerformancePolicy } from '../js/museum/performance-policy.js';

const balanced = { ratio: 1.25, economical: false };
const desktop = { width: 3840, height: 2160, pixelRatio: 2, profile: balanced };
const pixels = (view, ratio) => view.width * view.height * ratio ** 2;

test('4K and Retina views respect pixel budgets during movement and at rest', () => {
  const quality = selectPixelRatios(desktop);
  assert(pixels(desktop, quality.motion) <= 2_100_001);
  assert(pixels(desktop, quality.detail) <= 4_000_001);
  assert(quality.detail > quality.motion);
  const phone = { width: 430, height: 932, pixelRatio: 3, mobile: true, profile: balanced };
  const mobile = selectPixelRatios(phone);
  assert.equal(mobile.motion, 1.1);
  assert(pixels(phone, mobile.detail) <= 2_000_001);
});

test('slow navigation reduces settled memory cost and keeps the touch-device cap', () => {
  const policy = createPerformancePolicy();
  const before = selectPixelRatios(desktop);
  for (let i = 0; i < 80; i++) policy.sample(33, true);
  const after = selectPixelRatios({ ...desktop, profile: policy.profile });
  assert(after.motion < before.motion);
  assert(after.detail < before.detail);
  assert(pixels(desktop, after.detail) <= 2_400_001);
  assert(selectPixelRatios({ ...desktop, mobile: true, profile: policy.profile }).motion <= 1.1);
});

test('explicit detail restores resolution at rest without increasing motion cost', () => {
  const auto = selectPixelRatios(desktop), detail = selectPixelRatios({ ...desktop, mode: 'detail' });
  const fluid = selectPixelRatios({ ...desktop, mode: 'fluid' });
  assert.equal(detail.motion, auto.motion);
  assert(detail.detail > auto.detail);
  assert(pixels(desktop, detail.detail) <= 8_300_001);
  assert(fluid.motion <= .85 && fluid.detail <= 1);
});

test('small screens are not upscaled beyond their display and GPU texture limit is respected', () => {
  const small = selectPixelRatios({ width: 800, height: 600, pixelRatio: 1, profile: balanced });
  assert.equal(small.motion, 1);
  assert.equal(small.detail, 1);
  const limited = selectPixelRatios({ ...desktop, width: 9000, maxTextureSize: 2048 });
  assert(limited.detail * 9000 <= 2048);
});

test('iPad restores a three-megapixel settled view while retaining the motion budget', () => {
  const ipad = {width:1366,height:1024,pixelRatio:2,mobile:true,profile:balanced};
  const ratios = selectPixelRatios(ipad);
  assert(pixels(ipad,ratios.detail) >= 2_999_999);
  assert(pixels(ipad,ratios.motion) <= 1_200_001);
});
