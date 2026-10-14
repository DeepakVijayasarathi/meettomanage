import { useEffect, useMemo, useState } from "react";
import { GraduationCap, Search, UserSearch } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserStatusBadge } from "@/components/StatusBadge";
import { ROLE_META } from "@/lib/roles";
import { apiEnabled, userMessage } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listUsers, listStudents, toAppUser, type StudentRow } from "@/api/users";
import { PARENTS, TEACHERS, ADMISSION_TEAM, SUB_ADMINS } from "@/data/users";
import { CHILDREN } from "@/data/children";
import type { AppUser } from "@/types";
import { cn, formatDate, getInitials } from "@/lib/utils";

const MIN_QUERY_LENGTH = 2;
const ALL_DEMO_USERS: AppUser[] = [...PARENTS, ...TEACHERS, ...ADMISSION_TEAM, ...SUB_ADMINS];

function matchesUser(user: AppUser, query: string): boolean {
  const q = query.toLowerCase();
  return (
    user.name.toLowerCase().includes(q) ||
    user.email.toLowerCase().includes(q) ||
    user.phone.toLowerCase().includes(q)
  );
}

function UserAvatar({ name, color }: { name: string; color: string }) {
  return (
    <Avatar className="h-9 w-9">
      <AvatarFallback style={{ backgroundColor: `${color}22`, color }}>{getInitials(name)}</AvatarFallback>
    </Avatar>
  );
}

/**
 * Every real search across roles goes through the account-management screens themselves
 * (Users' Parents/Students/Teachers/Staff tabs), each scoped to one dataset — a teacher's
 * email can't be found from the Parents tab and vice versa. That's exactly the gap behind a
 * recurring support confusion: an admin adding a parent "for the first time" gets rejected as
 * a duplicate because the account was actually auto-provisioned earlier by a different flow
 * (Admission marking a demo booking "Ready for Enrollment" silently creates the parent's
 * login). This page exists purely so staff can answer "does an account already exist for this
 * email/name" in one lookup across every role — including students, who aren't User rows at
 * all — before assuming a duplicate report is wrong or trying to re-add someone.
 */
export default function SearchUsers() {
  const live = apiEnabled();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const [userResults, setUserResults] = useState<AppUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (debounced.length < MIN_QUERY_LENGTH) {
      setUserResults([]);
      setSearchError(null);
      setSearching(false);
      return;
    }

    if (!live) {
      setUserResults(ALL_DEMO_USERS.filter((u) => matchesUser(u, debounced)));
      return;
    }

    let cancelled = false;
    setSearching(true);
    setSearchError(null);
    listUsers({ search: debounced, pageSize: 50 })
      .then((result) => {
        if (!cancelled) setUserResults(result.items.map(toAppUser));
      })
      .catch((err: unknown) => {
        if (!cancelled) setSearchError(userMessage(err, "Search failed. Please try again."));
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debounced, live]);

  // Students aren't a search-endpoint role (Child records, not Users) — fetched once and
  // filtered client-side, same shape/fallback the Users page's Students tab already uses.
  const { data: allStudents } = useApiData<StudentRow[]>(listStudents, CHILDREN);
  const studentResults = useMemo(() => {
    if (debounced.length < MIN_QUERY_LENGTH) return [];
    const q = debounced.toLowerCase();
    return allStudents.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.parentName ?? "").toLowerCase().includes(q)
    );
  }, [allStudents, debounced]);

  const hasQuery = debounced.length >= MIN_QUERY_LENGTH;
  const totalResults = userResults.length + studentResults.length;

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title="Search Users"
        description="Look up any account — parent, teacher, staff or student — by name, email or phone before adding someone new."
      />

      <div className="relative mb-5 max-w-lg">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email or phone…"
          className="h-11 pl-9"
        />
      </div>

      {searchError && (
        <InlineAlert variant="warning" className="mb-4">
          {searchError}
        </InlineAlert>
      )}

      {!hasQuery ? (
        <EmptyState
          icon={UserSearch}
          title="Start typing to search"
          description={`Enter at least ${MIN_QUERY_LENGTH} characters of a name, email or phone number to search across every account and student.`}
        />
      ) : searching ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Searching…</p>
      ) : totalResults === 0 && !searchError ? (
        <EmptyState
          icon={UserSearch}
          title="No matches found"
          description="No account or student matches this search — it's safe to add them as a new user."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {userResults.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Accounts ({userResults.length})
              </p>
              <div className="overflow-x-auto rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userResults.map((user) => {
                      const roleMeta = ROLE_META[user.role];
                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <UserAvatar name={user.name} color={user.avatarColor} />
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-foreground">{user.name}</p>
                                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold")}
                              style={{ backgroundColor: `${roleMeta.hex}1a`, color: roleMeta.hex }}
                            >
                              {roleMeta.shortLabel}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{user.phone}</TableCell>
                          <TableCell>
                            <UserStatusBadge status={user.status} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(user.joinedOn)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {studentResults.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Students ({studentResults.length})
              </p>
              <div className="overflow-x-auto rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Name</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Parent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentResults.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-role-parent/10 text-role-parent">
                                <GraduationCap className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <p className="font-semibold text-foreground">{s.name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{s.grade || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{s.parentName ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Students aren't separate login accounts — they're managed under their parent's account.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
