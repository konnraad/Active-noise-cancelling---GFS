const fs = require("fs");
const wav = require("node-wav");
const { plot } = require("nodeplotlib");

class FxLMS_ANC {
  constructor(filterLength = 32, mu = 0.0005) {
    this.filterLength = filterLength; //Filter länge
    this.mu = mu; //mu = Lernrate / Abtastrate vom algo
    this.w = new Array(filterLength).fill(0); //Gewichtung des Filters (zusammenhängend mit x.Buffer -> Kontext also.)
    this.xBuffer = new Array(filterLength).fill(0); //Kontext für den Algorithmus
  }

  update(x_n, d_n) {
    //Buffer werden aktualisiert:
    this.xBuffer.shift();
    this.xBuffer.push(x_n);

    let y_n = this.w.reduce((sum, w_i, i) => sum + w_i * this.xBuffer[i], 0); //Ausgangs Summe wird berechnet
    let e_n = d_n - y_n; //Fehlerberechnung -> verbesserung der ANC qualität

    //Anpassung der Gewichtungen:
    for (let i = 0; i < this.filterLength; i++) {
      this.w[i] += 2 * this.mu * e_n * this.xBuffer[i];
    }

    return { y_n, e_n };
    //e_n = Fehler
    //y_n = Ausgang
  }
}

function loadWavFile(filename) {
  let buffer = fs.readFileSync(filename);
  let result = wav.decode(buffer);
  return result.channelData[0]; // Mono channel
}

// 📢 High-Pass Filter (Simple First-Order)
function highPassFilter(audioData, sampleRate, cutoff = 1000) {
  let RC = 1.0 / (cutoff * 2 * Math.PI);
  let dt = 1.0 / sampleRate;
  let alpha = RC / (RC + dt);
  let filteredData = [];
  let prevY = 0;
  let prevX = 0;

  for (let i = 0; i < audioData.length; i++) {
    let x = audioData[i];
    let y = alpha * (prevY + x - prevX);
    filteredData.push(y);
    prevX = x;
    prevY = y;
  }

  return filteredData;
}

// 💾 Save WAV file
function saveWavFile(filename, data, sampleRate) {
  let buffer = wav.encode([data], {
    sampleRate: sampleRate,
    float: true,
    bitDepth: 16,
  });
  fs.writeFileSync(filename, buffer);
}

// 🚀 Apply ANC and Save Combined Signal and Change Signal
async function processWavAndSaveSignals(
  inputFile,
  outputFile,

  changeFile
) {
  let sampleRate = 44100;
  let audioData = loadWavFile(inputFile);

  // Apply high-pass filter to focus on high frequencies
  let filteredData = highPassFilter(audioData, sampleRate, 1000);

  let anc = new FxLMS_ANC(32, 0.0005);
  let processedData = filteredData.map((sample) => {
    let { y_n, e_n } = anc.update(sample, sample);
    return e_n; // The processed (error) signal
  });

  // Save the processed output (this is the result of ANC)
  saveWavFile(outputFile, processedData, sampleRate);
  console.log(`✅ ANC processed: ${outputFile}`);

  // Combine the original and processed signals into the final output
  let combinedData = audioData.map((originalSample, index) => {
    return originalSample + processedData[index]; // Combine original and processed signals
  });

  // Save the combined signal

  // Calculate the difference (change) between the original and processed signal
  let changeData = audioData.map((originalSample, index) => {
    return processedData[index] - originalSample; // Difference (change) from original
  });

  // Save the change signal
  saveWavFile(changeFile, changeData, sampleRate);
  console.log(`✅ Change signal saved: ${changeFile}`);
}

// 🔥 Run with a File
processWavAndSaveSignals("input-2.wav", "output.wav", "change.wav");
