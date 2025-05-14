#!/bin/bash

# WhatsApp Bulk Sender Setup Script
echo "📱 WhatsApp Bulk Sender - Setup Script 📱"
echo "=========================================="
echo "This script will help you set up the WhatsApp Bulk Sender application."
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (LTS version) first."
    echo "You can download it from: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d "v" -f 2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d "." -f 1)
if [ $NODE_MAJOR -lt 16 ]; then
    echo "⚠️ Warning: Your Node.js version is $NODE_VERSION."
    echo "It's recommended to use Node.js 16 or later for this application."
    read -p "Do you want to continue anyway? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        echo "Setup cancelled. Please update Node.js."
        exit 1
    fi
fi

echo "✅ Node.js version $NODE_VERSION detected."

# Install dependencies
echo
echo "📦 Installing dependencies..."
npm install

# Create data directory if it doesn't exist
if [ ! -d "data" ]; then
    echo
    echo "📁 Creating data directory..."
    mkdir -p data
fi

# Check if sample CSV exists, create if not
if [ ! -f "data/phone_numbers_sample.csv" ]; then
    echo
    echo "📝 Creating sample CSV file..."
    echo "phone" > data/phone_numbers_sample.csv
    echo "9876543210" >> data/phone_numbers_sample.csv
    echo "9876543211" >> data/phone_numbers_sample.csv
    echo "9876543212" >> data/phone_numbers_sample.csv
    echo "9876543213" >> data/phone_numbers_sample.csv
    echo "9876543214" >> data/phone_numbers_sample.csv
    echo "Sample CSV created at data/phone_numbers_sample.csv"
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo
    echo "🔧 Creating .env configuration file..."
    read -p "Enter path to your phone numbers CSV [data/phone_numbers.csv]: " CSV_PATH
    CSV_PATH=${CSV_PATH:-data/phone_numbers.csv}
    
    read -p "Enter path to your PDF attachment [data/attachment.pdf]: " PDF_PATH
    PDF_PATH=${PDF_PATH:-data/attachment.pdf}
    
    read -p "Enter message text [Hello! Please find the attached document.]: " MESSAGE_TEXT
    MESSAGE_TEXT=${MESSAGE_TEXT:-"Hello! Please find the attached document."}
    
    read -p "Enter country code [91]: " COUNTRY_CODE
    COUNTRY_CODE=${COUNTRY_CODE:-91}
    
    read -p "Enter daily message limit [400]: " DAILY_LIMIT
    DAILY_LIMIT=${DAILY_LIMIT:-400}
    
    read -p "Enter batch size [100]: " BATCH_SIZE
    BATCH_SIZE=${BATCH_SIZE:-100}
    
    # Create .env file
    cat > .env << EOF
# WhatsApp Bulk Sender Configuration

# Path to the CSV file containing phone numbers
PHONE_NUMBERS_CSV=$CSV_PATH

# Path to the PDF file to be sent
PDF_FILE_PATH=$PDF_PATH

# Message to be sent
MESSAGE_TEXT="$MESSAGE_TEXT"

# Delay between messages in milliseconds (base delay, will be adjusted by adaptive system)
MESSAGE_DELAY=2000

# Country code for phone numbers
COUNTRY_CODE=$COUNTRY_CODE

# Maximum messages to send per day
DAILY_LIMIT=$DAILY_LIMIT

# Batch size for processing
BATCH_SIZE=$BATCH_SIZE
EOF

    echo ".env file created successfully"
fi

echo
echo "✅ Setup completed successfully!"
echo
echo "To use this application:"
echo "  1. Place your phone numbers CSV file at: $(grep PHONE_NUMBERS_CSV .env | cut -d "=" -f 2)"
echo "  2. Place your PDF attachment at: $(grep PDF_FILE_PATH .env | cut -d "=" -f 2)"
echo "  3. Run the application: npm start"
echo
echo "Other useful commands:"
echo "  - Check phone number validity: npm run validate YOUR_CSV_FILE"
echo "  - Monitor sending status: npm run status"
echo "  - Resume after stopping: npm run resume LAST_INDEX"
echo
echo "For more information, refer to the README.md file." 