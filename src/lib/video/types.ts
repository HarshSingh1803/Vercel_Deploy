export type MetadataCategoryId =
  | "location"
  | "timestamps"
  | "device"
  | "descriptive";

export type MetadataGroup =
  | "File"
  | "Video"
  | "Audio"
  | "Dates"
  | "Device"
  | "Location"
  | "Tags";

export type MetadataField = {
  key: string;
  label: string;
  value: string;
  category: MetadataCategoryId | "technical";
  removable: boolean;
  group: MetadataGroup;
};

export type VideoInspection = {
  fileName: string;
  fileType: string;
  fileSize: number;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  frameRate: string | null;
  videoCodec: string | null;
  audioCodec: string | null;
  fields: MetadataField[];
};

export type CleanResult = {
  blob: Blob;
  fileName: string;
  originalSize: number;
  cleanedSize: number;
  original: VideoInspection;
  cleaned: VideoInspection;
  removedLabels: string[];
  remainingNotes: string[];
};
