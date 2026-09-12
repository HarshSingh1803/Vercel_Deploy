import type { MetadataCategoryId } from "@/lib/video/types";

export const MAX_FILE_BYTES = 350 * 1024 * 1024;

export const SUPPORTED_EXTENSIONS = [
  "mp4",
  "mov",
  "m4v",
  "webm",
  "mkv",
  "avi",
] as const;

export const SUPPORTED_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-m4v",
  "video/webm",
  "video/x-matroska",
  "video/avi",
  "video/x-msvideo",
];

export const METADATA_CATEGORIES: Array<{
  id: MetadataCategoryId;
  label: string;
  description: string;
}> = [
  {
    id: "location",
    label: "Location / GPS",
    description: "Coordinates and location tags stored in the container.",
  },
  {
    id: "timestamps",
    label: "Creation dates",
    description: "Creation, encoded, and tagged timestamps.",
  },
  {
    id: "device",
    label: "Device & encoder",
    description: "Camera make/model and encoder identification tags.",
  },
  {
    id: "descriptive",
    label: "Titles, comments & tags",
    description: "Title, comment, copyright, artist, and similar labels.",
  },
];

export const CATEGORY_FFMPEG_KEYS: Record<MetadataCategoryId, string[]> = {
  location: [
    "location",
    "location-eng",
    "xyz",
    "com.apple.quicktime.location.ISO6709",
    "com.apple.quicktime.location.name",
    "GPS",
  ],
  timestamps: [
    "creation_time",
    "date",
    "year",
    "encoded_date",
    "tagged_date",
    "com.apple.quicktime.creationdate",
  ],
  device: [
    "encoder",
    "make",
    "model",
    "encoded_by",
    "encoding_tool",
    "com.apple.quicktime.make",
    "com.apple.quicktime.model",
    "com.apple.quicktime.software",
  ],
  descriptive: [
    "title",
    "comment",
    "comments",
    "description",
    "synopsis",
    "artist",
    "album",
    "genre",
    "copyright",
    "author",
    "performer",
    "composer",
  ],
};

export const PRIVACY_LIMITATIONS = [
  "Container-level tags such as GPS, titles, comments, and creation dates can be stripped.",
  "Codec, resolution, duration, and similar playback fields stay so the file still plays.",
  "Some encoder traces can remain inside compressed video or audio bitstreams.",
  "Cleaning uses stream copy when possible, so picture quality is not re-encoded.",
];
