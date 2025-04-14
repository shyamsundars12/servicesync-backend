!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dynamic Expense Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
        }

        .tab-button {
            padding: 10px 20px;
            background-color: #007BFF;
            color: white;
            border: none;
            cursor: pointer;
            border-radius: 5px;
        }

        .tab-button:hover {
            background-color: #0056b3;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }

        th {
            background-color: #f4f4f4;
        }
    </style>
</head>
<body>
    <button class="tab-button" onclick="generateExpenseReport()">Expense Report</button>

    <div id="table-container"></div>

    <script>
        function generateExpenseReport() {
            // Example expense data
            const expenseData = [
                { date: '2024-12-01', category: 'Travel', description: 'Taxi fare', amount: 50 },
                { date: '2024-12-02', category: 'Food', description: 'Lunch with client', amount: 30 },
                { date: '2024-12-03', category: 'Office Supplies', description: 'Stationery', amount: 20 },
                { date: '2024-12-04', category: 'Miscellaneous', description: 'Snacks for meeting', amount: 15 }
            ];

            // Get the container for the table
            const tableContainer = document.getElementById('table-container');
            
            // Clear any existing content
            tableContainer.innerHTML = '';

            // Create table
            const table = document.createElement('table');

            // Create header row
            const headerRow = document.createElement('tr');
            const headers = ['Date', 'Category', 'Description', 'Amount'];
            headers.forEach(headerText => {
                const th = document.createElement('th');
                th.textContent = headerText;
                headerRow.appendChild(th);
            });
            table.appendChild(headerRow);

            // Add rows for each expense
            expenseData.forEach(expense => {
                const row = document.createElement('tr');

                Object.values(expense).forEach(value => {
                    const td = document.createElement('td');
                    td.textContent = value;
                    row.appendChild(td);
                });

                table.appendChild(row);
            });

            // Append the table to the container
            tableContainer.appendChild(table);
        }
    </script>
</body>
</html>
