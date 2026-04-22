"use client";

import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, SectionSkeleton } from "@/components/ui/states";
import { useAuth } from "@/context/auth-context";
import { hasPermission } from "@/lib/permissions";
import { SchoolDetailHeader } from "@/components/schools/detail/school-detail-header";
import { SchoolDetailSummary } from "@/components/schools/detail/school-detail-summary";
import { SchoolDetailPrograms } from "@/components/schools/detail/school-detail-programs";
import { SchoolDetailModals } from "@/components/schools/detail/school-detail-modals";
import { useSchoolDetailWorkspace } from "@/components/schools/detail/use-school-detail-workspace";

export default function SchoolDetailsPage() {
  const { user } = useAuth();
  const routeParams = useParams<{ schoolId: string }>();
  const schoolId = routeParams.schoolId;
  const {
    schoolQuery,
    school,
    principalAssigned,
    open,
    uploadFile,
    uploadDryRun,
    uploadResult,
    adminForm,
    headForm,
    studentForm,
    editingProgram,
    programAction,
    programForm,
    pending,
    setOpen,
    setUploadFile,
    setUploadDryRun,
    setAdminForm,
    setHeadForm,
    setStudentForm,
    setProgramForm,
    closeModal,
    closeProgramActionModal,
    openProgramCreateModal,
    openProgramEditModal,
    openHeadModal,
    openProgramToggleModal,
    openProgramDeleteModal,
    submitProgramAction,
    submitAdmin,
    submitHead,
    submitStudent,
    submitUpload,
    submitProgram,
  } = useSchoolDetailWorkspace(schoolId);
  const canCreateAdmins = hasPermission(user?.role, "schools.onboard");

  if (schoolQuery.isLoading) {
    return <SectionSkeleton rows={5} />;
  }

  if (schoolQuery.error) {
    return (
      <Card>
        <ErrorState
          title="Could not load school details"
          description={schoolQuery.error?.message || "Try refreshing the page."}
          onRetry={() => {
            void schoolQuery.refetch();
          }}
        />
      </Card>
    );
  }

  if (!school) {
    return (
      <Card>
        <EmptyState title="School not found" description="The selected school does not exist or is out of scope." />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <SchoolDetailHeader
        name={school.name}
        type={school.type}
        location={school.location}
        canCreateAdmins={canCreateAdmins}
        principalAssigned={principalAssigned}
        onAddAdmin={() => setOpen("admin")}
        onEditHead={openHeadModal}
        onAddStudent={() => setOpen("student")}
        onUploadCsv={() => setOpen("upload")}
        onAddProgram={openProgramCreateModal}
      />

      <SchoolDetailSummary school={school} principalAssigned={principalAssigned} onEditHead={openHeadModal} />

      <SchoolDetailPrograms
        programs={school.programs}
        toggling={pending.toggleProgram}
        deleting={pending.deleteProgram}
        onAddProgram={openProgramCreateModal}
        onEditProgram={openProgramEditModal}
        onToggleProgram={openProgramToggleModal}
        onDeleteProgram={openProgramDeleteModal}
      />

      <SchoolDetailModals
        schoolName={school.name}
        principalAssigned={principalAssigned}
        open={open}
        programAction={programAction}
        editingProgram={editingProgram}
        adminForm={adminForm}
        headForm={headForm}
        studentForm={studentForm}
        programForm={programForm}
        uploadFile={uploadFile}
        uploadDryRun={uploadDryRun}
        uploadResult={uploadResult}
        pending={pending}
        onClose={closeModal}
        onCloseProgramAction={closeProgramActionModal}
        onSubmitProgramAction={submitProgramAction}
        onAdminFormChange={setAdminForm}
        onHeadFormChange={setHeadForm}
        onStudentFormChange={setStudentForm}
        onProgramFormChange={setProgramForm}
        onUploadFileChange={setUploadFile}
        onUploadDryRunChange={setUploadDryRun}
        onAdminSubmit={submitAdmin}
        onHeadSubmit={submitHead}
        onStudentSubmit={submitStudent}
        onUploadSubmit={submitUpload}
        onProgramSubmit={submitProgram}
      />
    </div>
  );
}
