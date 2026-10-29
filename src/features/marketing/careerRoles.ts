/** Open roles. Add an entry here to publish it: the Careers page lists it and emits JobPosting structured data
 *  for search. Leave the list empty when nothing is open, and the page shows an open-application note instead. */
export interface Role {
  id: string;
  title: string;
  department: string;
  /** e.g. "Remote, India" */
  location: string;
  type: "Full-time" | "Part-time" | "Contract" | "Internship";
  /** Two or three sentences on what the person will do. */
  summary: string;
  /** Plain bullet points. */
  requirements: string[];
  /** ISO date the role was posted, for JobPosting structured data. */
  postedOn: string;
}

export const OPEN_ROLES: Role[] = [];

export const CAREERS_EMAIL = "info@infinityuniquers.com";
