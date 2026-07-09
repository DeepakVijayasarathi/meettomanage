import type { AppUser } from "@/types";

export const TEACHERS: AppUser[] = [
  { id: "t-1", name: "Karan Mehta", email: "karan.mehta@readernest.com", phone: "+91 98200 11122", role: "teacher", status: "active", avatarColor: "#F08A1D", joinedOn: "2023-02-11", department: "Phonics" },
  { id: "t-2", name: "Isha Sharma", email: "isha.sharma@readernest.com", phone: "+91 98200 22233", role: "teacher", status: "active", avatarColor: "#8B5CF6", joinedOn: "2022-08-03", department: "Maths" },
  { id: "t-3", name: "Rohan Verma", email: "rohan.verma@readernest.com", phone: "+91 98200 33344", role: "teacher", status: "active", avatarColor: "#17A9C9", joinedOn: "2023-06-19", department: "Phonics" },
  { id: "t-4", name: "Meera Iyer", email: "meera.iyer@readernest.com", phone: "+91 98200 44455", role: "teacher", status: "active", avatarColor: "#23A455", joinedOn: "2021-11-27", department: "Maths" },
  { id: "t-5", name: "Aditya Nair", email: "aditya.nair@readernest.com", phone: "+91 98200 55566", role: "teacher", status: "inactive", avatarColor: "#EC4899", joinedOn: "2024-01-15", department: "Phonics" },
  { id: "t-6", name: "Sneha Kulkarni", email: "sneha.kulkarni@readernest.com", phone: "+91 98200 66677", role: "teacher", status: "active", avatarColor: "#EAB308", joinedOn: "2023-09-08", department: "Maths" },
];

export const PARENTS: AppUser[] = [
  { id: "p-1", name: "Rhea Kapoor", email: "rhea.kapoor@gmail.com", phone: "+91 99000 11111", role: "parent", status: "active", avatarColor: "#5B93E0", joinedOn: "2023-01-05" },
  { id: "p-2", name: "Vikram Singh", email: "vikram.singh@gmail.com", phone: "+91 99000 22222", role: "parent", status: "active", avatarColor: "#F08A1D", joinedOn: "2023-03-14" },
  { id: "p-3", name: "Anjali Gupta", email: "anjali.gupta@gmail.com", phone: "+91 99000 33333", role: "parent", status: "active", avatarColor: "#8B5CF6", joinedOn: "2023-05-21" },
  { id: "p-4", name: "Sameer Khan", email: "sameer.khan@gmail.com", phone: "+91 99000 44444", role: "parent", status: "active", avatarColor: "#17A9C9", joinedOn: "2022-12-02" },
  { id: "p-5", name: "Divya Bhatt", email: "divya.bhatt@gmail.com", phone: "+91 99000 55555", role: "parent", status: "active", avatarColor: "#EAB308", joinedOn: "2023-07-30" },
  { id: "p-6", name: "Nikhil Joshi", email: "nikhil.joshi@gmail.com", phone: "+91 99000 66666", role: "parent", status: "suspended", avatarColor: "#EC4899", joinedOn: "2023-04-11" },
  { id: "p-7", name: "Pooja Reddy", email: "pooja.reddy@gmail.com", phone: "+91 99000 77777", role: "parent", status: "active", avatarColor: "#23A455", joinedOn: "2022-10-19" },
  { id: "p-8", name: "Arjun Malhotra", email: "arjun.malhotra@gmail.com", phone: "+91 99000 88888", role: "parent", status: "active", avatarColor: "#3B82F6", joinedOn: "2023-08-25" },
  { id: "p-9", name: "Kavya Pillai", email: "kavya.pillai@gmail.com", phone: "+91 99000 99999", role: "parent", status: "active", avatarColor: "#F53BA6", joinedOn: "2024-02-09" },
  { id: "p-10", name: "Rahul Chawla", email: "rahul.chawla@gmail.com", phone: "+91 99000 10101", role: "parent", status: "inactive", avatarColor: "#57B33B", joinedOn: "2022-06-17" },
];

export const ADMISSION_TEAM: AppUser[] = [
  { id: "ad-1", name: "Priya Menon", email: "priya.menon@readernest.com", phone: "+91 98100 12121", role: "admission", status: "active", avatarColor: "#8B5CF6", joinedOn: "2023-01-10" },
  { id: "ad-2", name: "Farhan Ali", email: "farhan.ali@readernest.com", phone: "+91 98100 23232", role: "admission", status: "active", avatarColor: "#A855F7", joinedOn: "2023-09-01" },
];

export const SUB_ADMINS: AppUser[] = [
  { id: "sa-1", name: "Neha Kulkarni", email: "neha.kulkarni@readernest.com", phone: "+91 98300 12121", role: "subadmin", status: "active", avatarColor: "#0E9C8C", joinedOn: "2023-02-20" },
  { id: "sa-2", name: "Yash Patel", email: "yash.patel@readernest.com", phone: "+91 98300 23232", role: "subadmin", status: "active", avatarColor: "#0D9488", joinedOn: "2023-11-05" },
];

export const ALL_USERS: AppUser[] = [...TEACHERS, ...PARENTS, ...ADMISSION_TEAM, ...SUB_ADMINS];

export function getTeacherById(id: string) {
  return TEACHERS.find((t) => t.id === id);
}

export function getParentById(id: string) {
  return PARENTS.find((p) => p.id === id);
}
