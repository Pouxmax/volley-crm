import { google } from 'googleapis';

export const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID!;
export const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID!;

function getAuth() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/calendar.readonly',
    ],
  });
}

export async function getSheets() {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

export async function getCalendar() {
  const auth = getAuth();
  return google.calendar({ version: 'v3', auth });
}
