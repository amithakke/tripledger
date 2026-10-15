# TripLedger — Travel Expense Tracker

A responsive travel expense tracker built with HTML, CSS, and vanilla JavaScript.

## Open in Visual Studio Code

1. Download and extract `tripledger-repository.zip`.
2. In VS Code, choose **File → Open Folder...** and select `tripledger-repository`.
3. Open `public/index.html`.
4. Preview it by opening `public/index.html` in a browser. For easier development, install the VS Code **Live Server** extension, right-click `index.html`, and choose **Open with Live Server**.

No Node.js or npm installation is required.

## Project files

```text
tripledger-repository/
├── README.md
└── public/
    ├── index.html   # Page structure
    ├── style.css    # Layout, colors, responsive styling
    └── script.js    # Navigation, expenses, budget math, charts, map
```

## Features

- Starts with no expenses and a ₹0 trip budget.
- Enter a custom budget, destination, departure date, and return date.
- Destination map lookup using OpenStreetMap.
- Separate Overview, Spend & Expenses, and Trip & Map views within the same page.
- Animated ambient background with a rotating globe, glowing travel routes, airplane markers, stars, and a subtle India-inspired outline. The animation stays behind the interface while scrolling.
- Add and delete flight/train, hotel, restaurant, transport, activities, shopping, fees, insurance, tips, connectivity, parking, and other expenses.
- Automatically calculates spending and remaining budget.
- Category breakdown, spending chart, search, and category filters.
- Stores entries in the current browser with `localStorage`.

## Limitations

This is a front-end prototype. Data is saved in the current browser only; there are no user accounts, cloud sync, or shared database. The map is a destination lookup, not a multi-stop route planner. Do not enter sensitive payment card details.
