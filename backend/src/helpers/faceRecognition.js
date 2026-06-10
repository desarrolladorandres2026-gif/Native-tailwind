'use strict';

const path = require('path');

// Filtrar el banner informativo de TF.js (se imprime en el primer cómputo, no al cargar)
const _origWarn = console.warn;
console.warn = (...args) => {
  const msg = String(args[0] ?? '');
  if (msg.includes('====') || msg.includes('tfjs-node') || msg.includes('Hi there')) return;
  _origWarn.apply(console, args);
};

const canvas = require('canvas');
const faceapi = require('face-api.js');

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const MODELS_PATH = path.resolve(__dirname, '../../models/face-api');

let modelsLoaded = false;
let loadingPromise = null;

async function loadModels() {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_PATH);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH);
    modelsLoaded = true;
    console.log('[face-api] ✅ Modelos de reconocimiento facial cargados');
  })();

  return loadingPromise;
}

async function base64ToImg(base64) {
  const dataUrl = base64.startsWith('data:')
    ? base64
    : `data:image/jpeg;base64,${base64}`;
  return canvas.loadImage(dataUrl);
}

/**
 * Detecta si hay un rostro en la imagen base64.
 * @param {string} base64
 * @returns {Promise<boolean>}
 */
async function detectFace(base64) {
  await loadModels();
  const img = await base64ToImg(base64);
  const detection = await faceapi.detectSingleFace(img);
  return detection !== undefined;
}

/**
 * Extrae el descriptor facial (vector de 128 dimensiones) de la imagen base64.
 * Retorna null si no se detecta ningún rostro.
 * @param {string} base64
 * @returns {Promise<number[]|null>}
 */
async function getFaceDescriptor(base64) {
  await loadModels();
  const img = await base64ToImg(base64);
  const result = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();
  return result ? Array.from(result.descriptor) : null;
}

/**
 * Compara dos descriptores faciales usando distancia euclidiana.
 * Un threshold de 0.6 es el valor recomendado por face-api.js.
 * @param {number[]} stored   - descriptor guardado en DB
 * @param {number[]} incoming - descriptor de la imagen entrante
 * @param {number}   threshold
 * @returns {{ match: boolean, distance: number }}
 */
function compareFaces(stored, incoming, threshold = 0.6) {
  const d1 = new Float32Array(stored);
  const d2 = new Float32Array(incoming);
  let sum = 0;
  for (let i = 0; i < d1.length; i++) {
    const diff = d1[i] - d2[i];
    sum += diff * diff;
  }
  const distance = Math.sqrt(sum);
  return { match: distance <= threshold, distance };
}

module.exports = { detectFace, getFaceDescriptor, compareFaces, loadModels };
