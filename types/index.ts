export type Branch = 'CSE' | 'CSE-AIML' | 'CSE-DS' | 'IT';

export type ResourceType = 'notes' | 'qbank' | 'pyq' | 'syllabus' | 'youtube';

export type ResourceStatus = 'pending' | 'approved' | 'rejected';

export interface IUser {
  _id: string;
  rollNumber: string;
  name: string;
  passwordEncrypted: string;
  branch?: Branch;
  semester?: number;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
}

export interface IResource {
  _id: string;
  title: string;
  type: ResourceType;
  branch: Branch;
  semester: number;
  subject: string;
  url: string;
  fileType: 'pdf' | 'image' | 'docx' | 'youtube' | 'other';
  uploadedBy: string; // rollNumber
  status: ResourceStatus;
  createdAt: string;
}

export interface ISubject {
  _id: string;
  name: string;
  code: string;
  branch: Branch;
  semester: number;
}

export interface SessionPayload {
  rollNumber: string;
  name: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export interface AdminUserRow {
  _id: string;
  rollNumber: string;
  name: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  plainPassword?: string; // Only present for isSuperAdmin
}
