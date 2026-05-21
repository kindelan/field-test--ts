export interface BikeDTO {
  id: string;

  bikecode: string;
  bikecode_canon: string;

  motortype: string | null;

  motorcode: string | null;
  motorfirmware: string | null;

  batterytype: string | null;
  batterycode: string | null;
  batteryfirmware: string | null;

  hmicode: string | null;
  hmifirmware: string | null;

  other: string | null;
  location: string | null;
  scope: string | null;
  target: string | null;
  comments: string | null;

  field_test_id: string | null;

  created_at: string;
  updated_at: string;
}