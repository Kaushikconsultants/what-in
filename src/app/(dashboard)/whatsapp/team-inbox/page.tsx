"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  UserMinus,
  Plus,
  CheckCircle2,
  RefreshCw,
  Sliders,
  TrendingUp,
  ShieldCheck,
  Zap,
  Filter
} from "lucide-react";
import {
  getAllEmployeesAndTeams,
  addEmployeeToTeamAction,
  removeEmployeeFromTeamAction,
  createNewTeamAction
} from "@/app/actions/whatsAppPlatformActions";

export default function WhatsAppTeamInboxPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedFilterEmployee, setSelectedFilterEmployee] = useState<string>("ALL");

  // Create Team Modal State
  const [showCreateTeamModal, setShowCreateTeamModal] = useState<boolean>(false);
  const [teamName, setTeamName] = useState<string>("");
  const [teamDesc, setTeamDesc] = useState<string>("");

  // Add Member to Team State
  const [showAddMemberModal, setShowAddMemberModal] = useState<boolean>(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

  const loadData = async () => {
    setLoading(true);
    const res = await getAllEmployeesAndTeams();
    if (res.success) {
      setTeams(res.teams || []);
      setEmployees(res.employees || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Add Member to Team
  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !selectedEmployeeId) return;
    const res = await addEmployeeToTeamAction(selectedTeamId, selectedEmployeeId);
    if (res.success) {
      setShowAddMemberModal(false);
      loadData();
    }
  };

  // Handle Remove Member from Team
  const handleRemoveMember = async (empId: string) => {
    const res = await removeEmployeeFromTeamAction(empId);
    if (res.success) {
      loadData();
    }
  };

  // Handle Create New Team
  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName) return;
    const res = await createNewTeamAction(teamName, teamDesc);
    if (res.success) {
      setShowCreateTeamModal(false);
      setTeamName("");
      setTeamDesc("");
      loadData();
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    if (selectedFilterEmployee === "ALL") return true;
    return emp.id === selectedFilterEmployee;
  });

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Header & Team Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>
            Team Management & Individual Member Data Hub
          </h2>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: "2px 0 0 0" }}>
            Add/remove team members, assign lead routing policies & separately inspect each rep's workload.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Member Filter Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#ffffff", border: "1px solid #d1d5db", borderRadius: "6px", padding: "4px 10px" }}>
            <Filter size={14} color="#6b7280" />
            <select
              value={selectedFilterEmployee}
              onChange={(e) => setSelectedFilterEmployee(e.target.value)}
              style={{ border: "none", outline: "none", fontSize: "13px", fontWeight: 600, background: "transparent" }}
            >
              <option value="ALL">Filter: All Team Members</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.user?.name || emp.employeeId} ({emp.assignedWhatsAppConversations?.length || 0} Open Chats)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowAddMemberModal(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f3f4f6", border: "1px solid #d1d5db", padding: "8px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
          >
            <UserPlus size={16} /> Add Team Member
          </button>

          <button
            onClick={() => setShowCreateTeamModal(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "#10b981", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
          >
            <Plus size={16} /> Create Team
          </button>
        </div>
      </div>

      {/* Teams Overview Section */}
      <div>
        <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}>Active Sales & Support Teams</h3>
        {teams.length === 0 ? (
          <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "20px", textAlign: "center", color: "#9ca3af" }}>
            No custom teams created yet. Click "Create Team" to set up Sales Alpha or Support teams.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px" }}>
            {teams.map((team) => (
              <div key={team.id} style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div>
                    <h4 style={{ fontSize: "16px", fontWeight: 700, color: "#111827", margin: 0 }}>{team.name}</h4>
                    <p style={{ fontSize: "12px", color: "#6b7280", margin: "2px 0 0 0" }}>{team.description || "Sales & CRM Team"}</p>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 700, background: "#dcfce7", color: "#166534", padding: "3px 8px", borderRadius: "10px" }}>
                    {team.members?.length || 0} Members
                  </span>
                </div>

                <div style={{ background: "#fafafa", borderRadius: "8px", padding: "10px", border: "1px solid #f3f4f6" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#4b5563", textTransform: "uppercase" }}>Team Members</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
                    {team.members?.map((m: any) => (
                      <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12.5px", background: "#ffffff", padding: "6px 10px", borderRadius: "6px", border: "1px solid #e5e7eb" }}>
                        <span style={{ fontWeight: 600, color: "#111827" }}>{m.user?.name || m.employeeId}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "11px", color: "#059669", fontWeight: 600 }}>
                            {m.assignedWhatsAppConversations?.length || 0} Active Leads
                          </span>
                          <button
                            onClick={() => handleRemoveMember(m.id)}
                            style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "11px" }}
                            title="Remove Member from Team"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Individual Team Member Performance & Workload Grid */}
      <div>
        <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}>
          Individual Sales Representative Data & Workload
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
          {filteredEmployees.map((emp) => {
            const activeCount = emp.assignedWhatsAppConversations?.length || 0;
            return (
              <div key={emp.id} style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <div>
                    <h4 style={{ fontSize: "15px", fontWeight: 700, color: "#111827", margin: 0 }}>
                      {emp.user?.name || emp.employeeId}
                    </h4>
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>{emp.department || "Sales"} Executive</span>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 700, background: "#e0e7ff", color: "#3730a3", padding: "2px 6px", borderRadius: "4px" }}>
                    {emp.team?.name || "Unassigned Team"}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "12px", background: "#fafafa", padding: "10px", borderRadius: "6px" }}>
                  <div>
                    <span style={{ fontSize: "10.5px", color: "#6b7280", display: "block" }}>Open WhatsApp Leads</span>
                    <strong style={{ fontSize: "16px", color: "#10b981" }}>{activeCount} Leads</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "10.5px", color: "#6b7280", display: "block" }}>SLA Performance</span>
                    <strong style={{ fontSize: "16px", color: "#2563eb" }}>96.5%</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal 1: Create Team */}
      {showCreateTeamModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "#fff", borderRadius: "12px", width: "420px", padding: "20px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 14px 0" }}>Create New Team</h3>
            <form onSubmit={handleCreateTeamSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input
                type="text"
                placeholder="Team Name (e.g. Sales Alpha, Wholesale Support)"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                style={{ padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13.5px" }}
              />
              <textarea
                rows={3}
                placeholder="Team Description..."
                value={teamDesc}
                onChange={(e) => setTeamDesc(e.target.value)}
                style={{ padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13.5px", resize: "none" }}
              />
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button type="button" onClick={() => setShowCreateTeamModal(false)} style={{ padding: "8px 14px", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "6px" }}>Cancel</button>
                <button type="submit" style={{ padding: "8px 16px", background: "#10b981", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 700 }}>Save Team</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add Member to Team */}
      {showAddMemberModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "#fff", borderRadius: "12px", width: "420px", padding: "20px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 14px 0" }}>Add Member to Team</h3>
            <form onSubmit={handleAddMemberSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700 }}>Select Team</label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                style={{ padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13.5px" }}
              >
                <option value="">Choose Team...</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>

              <label style={{ fontSize: "12px", fontWeight: 700 }}>Select Employee</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                style={{ padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13.5px" }}
              >
                <option value="">Choose Sales Rep...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.user?.name || emp.employeeId} ({emp.department || "Sales"})
                  </option>
                ))}
              </select>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button type="button" onClick={() => setShowAddMemberModal(false)} style={{ padding: "8px 14px", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "6px" }}>Cancel</button>
                <button type="submit" style={{ padding: "8px 16px", background: "#10b981", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 700 }}>Add Member</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
