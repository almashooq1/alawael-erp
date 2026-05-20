'use strict';

/**
 * AR/VR Devices Catalog — كتالوج أجهزة الواقع الافتراضي / المعزز
 *
 * Reference data for device pickers + analytics grouping. Mirrors the
 * `device.model` enum on the ARVRSession schema (any addition here must
 * also land in the schema enum).
 */

const DEVICES = [
  {
    model: 'meta_quest_3',
    name: 'Meta Quest 3',
    vendor: 'Meta',
    formFactor: 'standalone_vr',
    handTracking: true,
    passthroughColor: true,
    recommended: true,
  },
  {
    model: 'meta_quest_pro',
    name: 'Meta Quest Pro',
    vendor: 'Meta',
    formFactor: 'standalone_vr',
    handTracking: true,
    eyeTracking: true,
    passthroughColor: true,
  },
  {
    model: 'htc_vive',
    name: 'HTC Vive (Pro 2)',
    vendor: 'HTC',
    formFactor: 'tethered_vr',
    handTracking: false,
  },
  {
    model: 'pico_4',
    name: 'Pico 4',
    vendor: 'ByteDance',
    formFactor: 'standalone_vr',
    handTracking: true,
    passthroughColor: true,
  },
  {
    model: 'apple_vision_pro',
    name: 'Apple Vision Pro',
    vendor: 'Apple',
    formFactor: 'standalone_xr',
    handTracking: true,
    eyeTracking: true,
    passthroughColor: true,
    recommended: true,
  },
  {
    model: 'hololens_2',
    name: 'Microsoft HoloLens 2',
    vendor: 'Microsoft',
    formFactor: 'standalone_ar',
    handTracking: true,
    eyeTracking: true,
  },
  {
    model: 'custom',
    name: 'جهاز مخصص',
    vendor: 'Other',
    formFactor: 'custom',
  },
  {
    model: 'other',
    name: 'أخرى',
    vendor: 'Other',
    formFactor: 'other',
  },
];

const DEVICES_BY_MODEL = Object.fromEntries(DEVICES.map(d => [d.model, d]));

function listDevices({ formFactor, handTracking } = {}) {
  return DEVICES.filter(d => {
    if (formFactor && d.formFactor !== formFactor) return false;
    if (handTracking != null && Boolean(d.handTracking) !== Boolean(handTracking)) return false;
    return true;
  });
}

module.exports = { DEVICES, DEVICES_BY_MODEL, listDevices };
