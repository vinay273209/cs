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

    // Get the highest Group ID
    const groupIds = data
      .map((entry) => entry["Group ID"])
      .filter((id) => id) // Filter out any undefined or null values
      .map((id) => parseInt(id.substring(1))) // Extract numeric part
      .filter((num) => !isNaN(num)); // Filter valid numbers

    console.log("Group IDs found:", groupIds);

    // If we have valid group IDs, increment the last one; otherwise, start with G1
    if (groupIds.length > 0) {
      const highestGroupId = Math.max(...groupIds);
      return `G${highestGroupId + 1}`;
    }
  }
  return "G1"; // Default to G1 if no data exists
};

// Function to check for duplicate roll numbers
const checkDuplicateRollNumbers = (workbook, newRollNumbers) => {
  const sheetName = "Project Info";
  let existingRollNumbers = [];

  if (workbook.SheetNames.includes(sheetName)) {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    existingRollNumbers = data
      .map((entry) => entry.University_Roll_No)
      .filter(Boolean); // Filter out undefined/null values
  }

  // Find duplicates between existing and new roll numbers
  const duplicates = newRollNumbers.filter((rollNo) =>
    existingRollNumbers.includes(rollNo)
  );
  return duplicates;
};

// POST route to handle data submission
app.post("/submit", (req, res) => {
  try {
    console.log("Received data:", req.body);
    const { projectTitle, members } = req.body;

    // Check for valid data
    if (!projectTitle || !members || members.length === 0) {
      console.error("Invalid data: Missing project title or members.");
      return res.status(400).json({ message: "Invalid data received." });
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
      // Create a new workbook and worksheet if the file does not exist
      workbook = XLSX.utils.book_new();
      worksheet = XLSX.utils.json_to_sheet([]);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Project Info");
      console.log("Created a new Excel file and worksheet.");

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

    // Check for duplicate roll numbers in the submitted data
    const newRollNumbers = members.map((member) => member.rollNo);

    // Check for duplicates in existing data
    const duplicates = checkDuplicateRollNumbers(workbook, newRollNumbers);

    // Check for duplicates in new members as well
    const duplicatesInNewMembers = newRollNumbers.filter(
      (rollNo, index) => newRollNumbers.indexOf(rollNo) !== index
    );

    // Combine duplicates from existing and new members
    const allDuplicates = [
      ...new Set([...duplicates, ...duplicatesInNewMembers]),
    ];

    if (allDuplicates.length > 0) {
      console.error("Duplicate Roll Numbers Found:", allDuplicates);
      return res.status(400).json({
        message: `Duplicate Roll Numbers Found: ${allDuplicates.join(", ")}`,
      });
    }

    // Generate a sequential Group ID
    const groupId = getNextGroupId(workbook);
    console.log("New Group ID:", groupId);

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
      skipHeader: true,
      origin: -1,
    });

    // Write the updated workbook to the file
    XLSX.writeFile(workbook, filename);
    console.log("Data successfully written to Excel.");

    res.json({ message: "Data successfully submitted and saved to Excel!" });
  } catch (error) {
    console.error("Error processing request:", error.message || error);
    console.error("Full error stack:", error);
    res
      .status(500)
      .json({ message: "An error occurred while processing your request." });
  }
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).send("404: Page not found");
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).send("404: Page not found");
});

// Start the server
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
