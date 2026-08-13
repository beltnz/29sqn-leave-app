/**
 * Centralized Help & Documentation Registry for Unit Leave System.
 * Stores structured help articles for App Level, Page Headers, Panels, and Modals.
 */

export interface FieldDoc {
  name: string;
  purpose: string;
  acceptableValues: string;
  unacceptableValues?: string;
}

export interface HelpSection {
  title: string;
  description: string;
  screenshotPlaceholder?: {
    title: string;
    description: string;
    imagePath?: string;
  };
  fields?: FieldDoc[];
}

export interface HelpArticle {
  key: string;
  title: string;
  subtitle: string;
  badge: "System Guide" | "Page Guide" | "Panel Reference" | "Modal Reference";
  purpose: string;
  sections: HelpSection[];
  bestPractices?: string[];
}

export const HELP_REGISTRY: Record<string, HelpArticle> = {
  // 1. App Level Help
  app_overview: {
    key: "app_overview",
    title: "Unit Leave Management System",
    subtitle: "High-level overview of system purpose, role workflows, and core architecture.",
    badge: "System Guide",
    purpose:
      "The Unit Leave Management System provides a streamlined, non-intrusive notification portal for personnel to log planned leave. Adjutants and Unit Leadership use the portal to maintain real-time threat board awareness and monitor unit readiness without requiring formal permission workflows.",
    sections: [
      {
        title: "Portal Structure & Key Features",
        description:
          "The system is divided into three primary portals accessible via the top navigation bar:",
        screenshotPlaceholder: {
          title: "System Navigation Bar & Top Header",
          description:
            "Screenshot showing the top navigation bar with Unit Emblem, Apply for Leave tab, Adjutant tab, Admin tab, Help trigger, and Dark Mode toggle.",
        },
        fields: [
          {
            name: "Apply for Leave",
            purpose: "Public submission portal for all cadets and staff to log planned leave.",
            acceptableValues: "Any active unit member.",
          },
          {
            name: "Adjutant Portal",
            purpose: "Operational dashboard showing 6-week Gantt status grid, active/past leave lists, and parade days affected per member.",
            acceptableValues: "Authenticated Adjutants & Unit Leadership.",
          },
          {
            name: "Admin Portal",
            purpose: "Member roster management, system settings (including Unit Name & Parade Night settings), security IP whitelist rules, and audit logging.",
            acceptableValues: "Authenticated System Administrators.",
          },
        ],
      },
      {
        title: "No-Permission Voluntary Notification Workflow",
        description:
          "Because the Unit is a volunteer organization, personnel log leave as a notification rather than requesting permission. All submissions immediately register on the Adjutant Status Grid.",
      },
    ],
    bestPractices: [
      "Log leave notifications as far in advance as possible to give Adjutants clear parade readiness visibility.",
      "Ensure rank and surname match your official roster record.",
      "For parade nights, use the 'This Parade Night' or 'Next Parade Night' quick shortcut buttons for fast 1-click date population.",
    ],
  },

  // 2. Page Level Help: Apply for Leave
  page_apply_leave: {
    key: "page_apply_leave",
    title: "Apply for Leave Page Guide",
    subtitle: "How personnel log upcoming or past leave notifications for the Unit.",
    badge: "Page Guide",
    purpose:
      "This page provides the main entry point for cadets, staff, and officers to notify the unit of upcoming leave, training conflicts, or personal absences.",
    sections: [
      {
        title: "Screen Overview",
        description:
          "The page consists of a header banner and the primary Leave Notification Form panel. Submissions are processed in real-time.",
        screenshotPlaceholder: {
          title: "Apply for Leave Screen Layout",
          description:
            "Screenshot of the full Apply for Leave page showing header icon, description text, and the form container.",
        },
      },
      {
        title: "Quick Parade Shortcuts",
        description:
          "Below the date inputs, quick action buttons allow instant 1-click selection of 'This Parade Night' or 'Next Parade Night' parade dates, as well as +1 Day, +3 Days, and +7 Days duration extenders.",
      },
    ],
    bestPractices: [
      "Select accurate dates so Parade Night counts are correctly calculated.",
      "If taking leave for a single parade night, set both Start Date and End Date to that Parade Night date.",
    ],
  },

  // 3. Panel Level Help: Leave Request Form
  panel_leave_form: {
    key: "panel_leave_form",
    title: "Log Leave Notification Form Guide",
    subtitle: "Complete field reference, acceptable input values, and validation rules.",
    badge: "Panel Reference",
    purpose:
      "Explains each input field inside the Leave Notification Form, required formats, acceptable values, and shortcut tools.",
    sections: [
      {
        title: "Form Layout & Elements",
        description:
          "Fill in your Rank, Surname, Date Range, and Reason. Click 'Log Leave Notification' to complete.",
        screenshotPlaceholder: {
          title: "Log Leave Notification Form Detail",
          description:
            "Screenshot of the Leave Notification Form highlighting Rank dropdown, Surname text box, Date Pickers, Reason category selector, and Submit button.",
        },
        fields: [
          {
            name: "Rank",
            purpose: "Identifies your official NZCF rank.",
            acceptableValues: "CDT, LACDT, CDTCPL, CDTSGT, CDTFSGT, OFFCDT, PLTOFF, FGOFF, FLTLT, SQNLDR, MRS, CIV.",
            unacceptableValues: "Custom rank strings not in standard NZCF list.",
          },
          {
            name: "Surname",
            purpose: "Your official last name for roster tracking.",
            acceptableValues: "1 to 50 characters (letters, spaces, hyphens, apostrophes e.g., 'Smith', 'MacDonald', 'Delos Santos').",
            unacceptableValues: "Empty strings, numeric-only strings, special characters like @ # $ % *.",
          },
          {
            name: "Start Date",
            purpose: "First day of your leave period.",
            acceptableValues: "Valid calendar date string (YYYY-MM-DD).",
            unacceptableValues: "Invalid dates, gibberish strings.",
          },
          {
            name: "End Date",
            purpose: "Final day of your leave period.",
            acceptableValues: "Valid calendar date string (YYYY-MM-DD) on or after Start Date.",
            unacceptableValues: "End Date occurring before Start Date.",
          },
          {
            name: "Reason Category",
            purpose: "Primary categorization for leave logging.",
            acceptableValues: "Exams / Academic Study, Work Commitments, Family Holiday / Personal, Medical / Illness, School Camp / Activity, Other.",
            unacceptableValues: "Unselected reason category.",
          },
          {
            name: "Custom Reason Detail (if Other*/Private/Personal*)",
            purpose: "Additional explanation when 'Other*' or 'Private/Personal*' is chosen.",
            acceptableValues: "1 to 200 characters explaining context.",
            unacceptableValues: "Blank text when 'Other*' is selected.",
          },
        ],
      },
    ],
    bestPractices: [
      "Use the 'This Parade Night' or 'Next Parade Night' shortcut buttons to set parade night leave with a single click.",
      "Click 'Clear Form' if you need to reset all fields.",
    ],
  },

  // 3. Admin Portal Page Guide
  page_admin_portal: {
    key: "page_admin_portal",
    title: "Admin Control Panel Guide",
    subtitle: "System administration, member accounts, security rules, and global configuration.",
    badge: "Page Guide",
    purpose:
      "The Admin Control Panel allows authorized System Administrators to manage user accounts, configure security IP rules, set operational variables (unit name, parade night, rank options), and inspect system audit logs.",
    sections: [
      {
        title: "Screen Layout & Management Panels",
        description:
          "The panel is organized into four reorderable panels: Members, IP Whitelist & Blacklist Maintenance, Unit Configuration Settings, and System Audit Trail. Panels can be dragged to reorder or clicked to collapse.",
      },
      {
        title: "Executive Access & Role Hierarchy",
        description:
          "Accounts are granted specific executive roles: Admin (system access), Adjutant (portal dashboard), and Staff (email notification recipients). Minimum 1 active Admin is required at all times.",
      },
    ],
    bestPractices: [
      "Keep at least two active Admin accounts configured to prevent lockout.",
      "Review the System Audit Trail regularly for administrative and security activity.",
      "Use short, recognizable unit names in Unit Configuration Settings.",
    ],
  },

  // 4. Admin Members Panel Guide
  panel_admin_members: {
    key: "panel_admin_members",
    title: "Members Roster & Accounts Guide",
    subtitle: "Creating, editing, disabling, and managing pre-approved staff and executive accounts.",
    badge: "Panel Reference",
    purpose:
      "Manage pre-approved accounts for Adjutants, Staff, Managers, and System Admins. Ensure a minimum of 1 active Admin is maintained at all times.",
    sections: [
      {
        title: "Account Fields & Controls",
        description:
          "Configure account credentials, roles, and status. Click 'Add New Member Account' to expand the registration form.",
        fields: [
          {
            name: "Rank & Surname",
            purpose: "Identifies the member on the roster and in system activity logs.",
            acceptableValues: "Rank selected from dropdown, Surname (1-50 letters/spaces).",
          },
          {
            name: "Email Address",
            purpose: "Primary login email and recipient for leave notification alerts.",
            acceptableValues: "Valid email address string.",
          },
          {
            name: "Roles (Admin, Adjutant, Staff)",
            purpose: "Determines permission levels and dashboard access.",
            acceptableValues: "Any combination of Admin, Adjutant, or Staff toggles.",
          },
          {
            name: "Account Active Toggle",
            purpose: "Enables or disables system login for this account.",
            acceptableValues: "Active (enabled) or Inactive (disabled). Cannot disable only active Admin.",
          },
        ],
      },
    ],
    bestPractices: [
      "Test email delivery using the 'Send Test Email' button after registering new staff.",
      "Disable accounts for departed personnel rather than deleting to preserve audit history.",
    ],
  },

  // 5. Admin IP Rules Panel Guide
  panel_admin_ip_rules: {
    key: "panel_admin_ip_rules",
    title: "IP Whitelist & Blacklist Rules Guide",
    subtitle: "Managing IP access rules, auto-whitelisting, and automated 30-day expiration.",
    badge: "Panel Reference",
    purpose:
      "Maintain IP security rules for the application. Admins are automatically whitelisted on successful login, and blacklisted IPs expire automatically after 30 days.",
    sections: [
      {
        title: "Security Rules & Expiration",
        description:
          "Whitelist rules grant unrestricted access; Blacklist rules block access immediately. Blacklisted entries automatically expire after 30 days.",
        fields: [
          {
            name: "IP Address",
            purpose: "Network IP target for rule evaluation.",
            acceptableValues: "Valid IPv4 or IPv6 string.",
          },
          {
            name: "Type (Whitelist / Blacklist)",
            purpose: "Determines whether traffic from this IP is allowed or blocked.",
            acceptableValues: "WHITELIST or BLACKLIST.",
          },
        ],
      },
    ],
  },

  // 6. Admin Unit Settings Panel Guide
  panel_admin_unit_settings: {
    key: "panel_admin_unit_settings",
    title: "Unit Configuration Settings Guide",
    subtitle: "Global operational settings, unit name, parade night, rank dropdown options, and inactivity timeouts.",
    badge: "Panel Reference",
    purpose:
      "Configure unit-wide variables that apply globally across all pages and components.",
    sections: [
      {
        title: "Global Operational Variables",
        description:
          "Update settings to match your unit's structure. Changes take effect immediately site-wide.",
        fields: [
          {
            name: "Unit Name",
            purpose: "Display name used in headers, page titles, and email dispatches.",
            acceptableValues: "Short text string (e.g. 29 Squadron, 29 SQN, TACCU, Chatham).",
          },
          {
            name: "Rank Options Dropdown",
            purpose: "Comma-separated list of ranks for dropdown selections, with quick preset buttons for Sea, Land, and Air Cadets.",
            acceptableValues: "Comma-separated string of ranks.",
          },
          {
            name: "Unit Parade Night",
            purpose: "Day of the week personnel meet. Controls parade preset calculations.",
            acceptableValues: "Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.",
          },
          {
            name: "Logged in User Time-out",
            purpose: "Inactivity duration in seconds before automatic logout.",
            acceptableValues: "Integer (seconds), default 600 (10 minutes).",
          },
        ],
      },
    ],
  },

  // 7. Admin Audit Trail Panel Guide
  panel_admin_audit_trail: {
    key: "panel_admin_audit_trail",
    title: "System Audit Trail Guide",
    subtitle: "Chronological log of administrative actions, user activity, and security events.",
    badge: "Panel Reference",
    purpose:
      "Inspect full audit history of leave creations, login attempts, IP rule changes, member edits, and setting updates.",
    sections: [
      {
        title: "Audit Log Structure",
        description:
          "Logs record every critical system event, auto-trimmed to the last 30 days.",
        fields: [
          {
            name: "Stamp",
            purpose: "NZ-formatted timestamp of the event.",
            acceptableValues: "Date and time string.",
          },
          {
            name: "Action & Actor",
            purpose: "Classification of action and user/IP responsible.",
            acceptableValues: "Event type (e.g. LEAVE_CREATE, ADMIN_LOGIN_SUCCESS) and actor identity.",
          },
        ],
      },
    ],
  },

  // 8. Adjutant Portal Page Guide
  page_adjutant_portal: {
    key: "page_adjutant_portal",
    title: "Adjutant Portal Guide",
    subtitle: "Operational dashboard for tracking unit leave notifications and parade night readiness.",
    badge: "Page Guide",
    purpose:
      "The Adjutant Portal allows Adjutants and Unit Leadership to monitor active leave notifications, inspect a 6-week timeline grid, review parade night impacts per member, and audit completed leave history.",
    sections: [
      {
        title: "Operational Dashboard Panels",
        description:
          "The dashboard features four primary interactive panels: Unit Leave Status (6-Week Grid), Active & Upcoming Leave Submissions, Completed Leave History, and Member Parade Days Summary.",
      },
    ],
    bestPractices: [
      "Use the 'Scroll to Today' button on the timeline grid to instantly center view on today's date.",
      "Click any leave row in the active or completed lists to open detailed metric overlays.",
    ],
  },

  // 9. Adjutant Timeline Panel Guide
  panel_adjutant_timeline: {
    key: "panel_adjutant_timeline",
    title: "Unit Leave Status & Timeline Guide",
    subtitle: "6-week Gantt status grid showing 2 weeks past, today, and 4 weeks future.",
    badge: "Panel Reference",
    purpose:
      "Visual Gantt chart displaying all personnel with active leave overlapping the 6-week window. Highlights parade nights in purple and today's date with a distinct vertical marker.",
    sections: [
      {
        title: "Timeline Controls & Legend",
        description:
          "Parade nights are rendered at double width (80px) for clear visibility. Click 'Scroll to Today' to auto-align the view.",
      },
    ],
  },

  // 10. Adjutant Upcoming Panel Guide
  panel_adjutant_upcoming: {
    key: "panel_adjutant_upcoming",
    title: "Active & Upcoming Leave Submissions Guide",
    subtitle: "Paginated list of all active or future leave notifications yet to conclude.",
    badge: "Panel Reference",
    purpose:
      "Inspect current and scheduled leave notifications. Shows personnel surname, rank, leave reason, date range, total days, and parade nights affected.",
    sections: [
      {
        title: "Detail Inspection & Deletion",
        description:
          "Click any row to open the full Leave Detail Modal with elapsed/ahead metrics. Adjutants can delete incorrect entries using the trash icon.",
      },
    ],
  },

  // 11. Adjutant Completed Panel Guide
  panel_adjutant_completed: {
    key: "panel_adjutant_completed",
    title: "Completed Leave History Guide",
    subtitle: "Historical record of all past leave notifications.",
    badge: "Panel Reference",
    purpose:
      "Review concluded leave entries for reporting and historical audit tracking.",
    sections: [
      {
        title: "Archival Access",
        description:
          "Historical entries are stored permanently unless manually removed by an Adjutant or Admin.",
      },
    ],
  },

  // 12. Adjutant Parade Summary Panel Guide
  panel_adjutant_parade_summary: {
    key: "panel_adjutant_parade_summary",
    title: "Member Parade Days Summary Guide",
    subtitle: "Cumulative parade nights affected per personnel across all logged leave.",
    badge: "Panel Reference",
    purpose:
      "Tracks cumulative parade night absences per member to assist Adjutants in identifying attendance trends and training impacts.",
    sections: [
      {
        title: "Parade Night Calculations",
        description:
          "Calculated dynamically based on the active Unit Parade Night setting configured in Admin settings.",
      },
    ],
  },

  // 13. Admin Term Dates Panel Guide
  panel_admin_term_dates: {
    key: "panel_admin_term_dates",
    title: "Term Dates Guide",
    subtitle: "Configuring school/unit term start and end dates for Terms 1 through 4.",
    badge: "Panel Reference",
    purpose:
      "Maintain official term date boundaries per academic year. Allows admins to configure T1, T2, T3, and T4 start and end dates.",
    sections: [
      {
        title: "Yearly Term Configurations",
        description:
          "Click 'Add Year' to open the modal dialog and specify date boundaries for each term using the date pickers.",
        fields: [
          {
            name: "Year",
            purpose: "Academic or operational year (e.g. 2026).",
            acceptableValues: "4-digit year number.",
          },
          {
            name: "Terms 1-4 Start & End Dates",
            purpose: "Date boundaries defining each term.",
            acceptableValues: "Valid calendar date (YYYY-MM-DD).",
          },
        ],
      },
    ],
  },
};
