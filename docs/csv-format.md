# CSV File Format Guide

This guide explains how to format your CSV files for use with the WhatsApp Bulk Sender.

## Basic Requirements

- The CSV file **must** include a header row
- It **must** contain at least one column with phone numbers
- The phone number column should be named `phone` or `phoneNumber` (or will default to the first column)
- Phone numbers should be in full international format (country code + number, without `+` or spaces)

## Sample CSV Files

### Minimal Format (Recommended)

This is the simplest format, with just a column for phone numbers:

```csv
phone
919876543210
919876543211
919876543212
918765432100
918765432101
```

### With Additional Data

You can include additional columns, which will be ignored by the sender:

```csv
name,phone,group
John Doe,919876543210,Group A
Jane Smith,919876543211,Group A
Michael Johnson,919876543212,Group B
Emily Brown,918765432100,Group B
David Wilson,918765432101,Group C
```

## Phone Number Format

- Include the country code (e.g., `91` for India) without the `+` sign
- Remove any spaces, dashes, or other separators
- Do not include leading zeros that come after the country code

### Examples:

| Correct Format | Incorrect Formats |
| -------------- | ----------------- |
| 919876543210   | +919876543210     |
| 919876543210   | 91 98765 43210    |
| 919876543210   | 9198-7654-3210    |
| 919876543210   | 0919876543210     |

## CSV Formatting Tips

1. **Use a CSV editor**: Use a proper CSV editor or spreadsheet application to create your files.
2. **Save in UTF-8 format**: Make sure your CSV is saved in UTF-8 encoding.
3. **Validate before sending**: Check your CSV file for formatting errors before uploading.
4. **Avoid special characters**: Some special characters may cause issues in CSV parsing.

## Excel to CSV Conversion

If you're working with Excel:

1. Go to File > Save As
2. Choose "CSV (Comma delimited) (\*.csv)" as the file type
3. Click Save

## Sample Files

Sample CSV files are provided in the `samples` directory:

- `sample_numbers.csv`: Basic format with just phone numbers
- `sample_with_names.csv`: Format with additional columns

## Common Issues

- **Missing header row**: Make sure your CSV file includes a header row.
- **Incorrect column name**: Ensure your phone number column is named `phone` or `phoneNumber`.
- **Formatting errors**: Check for spaces, special characters, or incorrect formatting of phone numbers.
- **Encoding issues**: Save your CSV file in UTF-8 encoding to avoid character display problems.
