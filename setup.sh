#!/bin/bash

# WhatsApp Bulk Sender Setup Script

# Ensure we're in the project directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR" || exit 1

echo "Setting up WhatsApp Bulk Sender..."

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "Node.js is not installed. Please install Node.js first."
    echo "Visit https://nodejs.org/ for installation instructions."
    exit 1
fi

# Create necessary directories
echo "Creating directories..."
mkdir -p data

# Install dependencies
echo "Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat << EOF > .env
# Path to the CSV file containing phone numbers
PHONE_NUMBERS_CSV=./data/phone_numbers.csv

# Path to the PDF file to be sent
PDF_FILE_PATH=./data/attachment.pdf

# Message to be sent
MESSAGE_TEXT="Hello! Please find the attached document."

# Delay between messages in milliseconds (to avoid spam detection)
MESSAGE_DELAY=3000

# Country code for the phone numbers (e.g., 91 for India)
COUNTRY_CODE=91
EOF
    echo ".env file created."
else
    echo ".env file already exists."
fi

# Make CLI script executable
chmod +x src/cli.js

echo "Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Place your CSV file with phone numbers in data/phone_numbers.csv"
echo "   - Use 'npm run validate <your-csv-file>' to validate your CSV"
echo "   - Use 'npm run convert <input-file> <output-csv>' to convert other formats to CSV"
echo ""
echo "2. Place your PDF file in data/attachment.pdf"
echo ""
echo "3. Run the application with 'npm start'"
echo "   - Scan the QR code with your WhatsApp to login"
echo ""
echo "Thank you for using WhatsApp Bulk Sender!" 