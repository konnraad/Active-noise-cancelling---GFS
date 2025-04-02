const fs = require("fs");
const wav = require("wav-decoder");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");

// 📌 Funktion zum Laden und Dekodieren einer WAV-Datei
async function loadWavFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  const decoded = await wav.decode(buffer);
  return decoded.channelData[0]; // Nur ein Kanal (Mono)
}

// 📌 Hauptfunktion zum Vergleichen von zwei WAV-Dateien
async function compareWavFiles(file1, file2, file3) {
  const data1 = await loadWavFile(file1);
  const data2 = await loadWavFile(file2);
  const data3 = await loadWavFile(file3);

  const length = Math.min(data1.length, data2.length);
  const sampleRate = 44100; // Annahme: 44.1 kHz
  const timeAxis = Array.from(
    { length: length / 1000 },
    (_, i) => i / sampleRate
  );

  // 📌 Diagramm erstellen
  const chart = new ChartJSNodeCanvas({ width: 6000, height: 2000 });
  const config = {
    type: "line",
    data: {
      labels: timeAxis,
      datasets: [
        {
          label: "Original",
          data: data1.slice(0, length / 1000),
          borderColor: "blue",
          fill: false,
        },
        {
          label: "Processed (ANC)",
          data: data2.slice(0, length / 1000),
          borderColor: "red",
          fill: false,
        },
        {
          label: "Result",
          data: data3.slice(0, length / 1000),
          borderColor: "green",
          fill: false,
        },
      ],
    },
    options: { responsive: false },
  };

  const image = await chart.renderToBuffer(config);
  fs.writeFileSync("output.png", image);
  console.log("Vergleich gespeichert als output.png");
}

// Starte den Vergleich (Dateipfade anpassen!)
compareWavFiles("input-2.wav", "change.wav", "output.wav");
