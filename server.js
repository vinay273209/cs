const express = require("express");
const bodyParser = require("body-parser");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

// Initialize the app
const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });

// POST route to handle data submission
app.post("/submit", (req, res) => {
  const { projectTitle, members } = req.body;

  // Check for duplicate roll numbers
  const rollNumbers = members.map((member) => member.rollNo);
  const duplicates = rollNumbers.filter(
    (item, index) => rollNumbers.indexOf(item) !== index
  );
  if (duplicates.length > 0) {
    return res.json({
      message: `Duplicate Roll Numbers Found: ${duplicates.join(", ")}`,
    });
  }

  // Prepare the Excel sheet
  const filename = "Project_Group_Info.xlsx";
  let workbook;
  let worksheet;

  // Check if file exists
  if (fs.existsSync(filename)) {
    workbook = XLSX.readFile(filename);
    worksheet = workbook.Sheets[workbook.SheetNames[0]];
  } else {
    workbook = XLSX.utils.book_new();
    worksheet = XLSX.utils.json_to_sheet([]);
  }

  // Prepare the data to write
  members.forEach((member) => {
    const row = {
      Project_Title: projectTitle,
      University_Roll_No: member.rollNo,
      Name: member.name,
      Mobile_No: member.mobile,
      Section: member.section,
    };
    XLSX.utils.sheet_add_json(worksheet, [row], {
      skipHeader: false,
      origin: -1,
    });
  });

  // Write the updated worksheet to the file
  XLSX.utils.book_append_sheet(workbook, worksheet, "Project Info");
  XLSX.writeFile(workbook, filename);

  res.json({ message: "Data successfully submitted and saved to Excel!" });
});

// Handle 404 errors
app.use((req, res) => {
    res.status(404).send("404: Page not found");
  });

// Start the server
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
