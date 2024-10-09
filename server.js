const express = require("express");
const bodyParser = require("body-parser");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

// Initialize the app
const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

// Serve the main HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Function to get the next Group ID
const getNextGroupId = (workbook) => {
  const sheetName = "Project Info";
  if (workbook.SheetNames.includes(sheetName)) {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    const lastGroupId = data.length > 0 ? data[data.length - 1].Group_ID : "G0"; // Start from G0
    const groupIdNumber = parseInt(lastGroupId.substring(1)) + 1; // Increment the group ID
    return `G${groupIdNumber}`; // Return new Group ID
  }
  return "G1"; // Default to G1 if no data exists
};

// POST route to handle data submission
app.post("/submit", (req, res) => {
  console.log("Received data:", req.body);
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
    worksheet = XLSX.utils.json_to_sheet([]); // Create a new worksheet
    XLSX.utils.book_append_sheet(workbook, worksheet, "Project Info");

    // Add headers if it's a new sheet
    const headers = {
      Group_ID: "Group ID",
      Project_Title: "Project Title",
      University_Roll_No: "University Roll No",
      Name: "Name",
      Mobile_No: "Mobile No",
      Section: "Section",
    };
    XLSX.utils.sheet_add_json(worksheet, [headers], {
      skipHeader: true,
      origin: 0,
    });
  }

  // Generate a sequential Group ID
  const groupId = getNextGroupId(workbook);

  // Prepare rows for the group, one for each member
  const rows = members.map((member) => ({
    Group_ID: groupId,
    Project_Title: projectTitle,
    University_Roll_No: member.rollNo,
    Name: member.name,
    Mobile_No: member.mobile,
    Section: member.section,
  }));

  // Append the new rows to the existing worksheet
  XLSX.utils.sheet_add_json(worksheet, rows, {
    skipHeader: true, // Skip the header to avoid duplication
    origin: -1, // Append to the last row
  });

  // Write the updated workbook to the file
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
