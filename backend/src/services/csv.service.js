const { ExportToCsv } = require("export-to-csv");

exports.makeCsv = (rows) => {
  const csvExporter = new ExportToCsv({
    fieldSeparator: ";",
    quoteStrings: '"',
    decimalSeparator: ".",
    showLabels: true,
    useBom: true,
    headers: ["timestamp", "value"]
  });

  return csvExporter.generateCsv(rows, true);
};
