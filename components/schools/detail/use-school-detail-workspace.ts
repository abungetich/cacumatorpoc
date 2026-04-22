"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/context/toast-context";
import type { SchoolProgramRow, StudentMasterUploadResponse } from "@/lib/api-types";
import {
  addSchoolAdmin,
  addSchoolStudent,
  createSchoolProgram,
  deleteSchoolProgram,
  fetchSchoolDetail,
  updateSchoolHead,
  updateSchoolProgram,
  uploadSchoolStudentsCsv,
} from "@/lib/school-management-actions";
import {
  emptyAdminForm,
  emptyHeadForm,
  emptyProgramForm,
  emptyStudentForm,
  isPrincipalAssigned,
  type ModalMode,
  type ProgramActionState,
} from "@/lib/school-detail-workspace";
import { confirmAdminCreated } from "@/components/schools/detail/school-detail-modals";

export function useSchoolDetailWorkspace(schoolId: string) {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [open, setOpen] = useState<ModalMode>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDryRun, setUploadDryRun] = useState(true);
  const [uploadResult, setUploadResult] = useState<StudentMasterUploadResponse | null>(null);
  const [adminForm, setAdminForm] = useState(emptyAdminForm);
  const [headForm, setHeadForm] = useState(emptyHeadForm);
  const [studentForm, setStudentForm] = useState(emptyStudentForm);
  const [editingProgram, setEditingProgram] = useState<SchoolProgramRow | null>(null);
  const [programAction, setProgramAction] = useState<ProgramActionState>(null);
  const [programForm, setProgramForm] = useState(emptyProgramForm);

  const schoolQuery = useQuery({
    queryKey: ["school-detail", schoolId],
    queryFn: () => fetchSchoolDetail(schoolId),
    enabled: Boolean(schoolId),
  });

  const school = schoolQuery.data?.item ?? null;
  const principalAssigned = school ? isPrincipalAssigned(school.principalName, school.principalEmail) : false;

  const resetProgramForm = () => {
    setEditingProgram(null);
    setProgramForm(emptyProgramForm);
  };

  const closeModal = () => {
    setOpen(null);
    setUploadFile(null);
    setUploadResult(null);
    resetProgramForm();
  };

  const closeProgramActionModal = () => {
    setProgramAction(null);
  };

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["school-detail"] });
    await queryClient.invalidateQueries({ queryKey: ["managed-schools"] });
    await queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
    await queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
  };

  const adminMutation = useMutation({
    mutationFn: () => addSchoolAdmin(schoolId, adminForm),
    onSuccess: refresh,
  });

  const headMutation = useMutation({
    mutationFn: () => updateSchoolHead(schoolId, headForm),
    onSuccess: refresh,
  });

  const studentMutation = useMutation({
    mutationFn: () => addSchoolStudent(schoolId, studentForm),
    onSuccess: refresh,
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!uploadFile) {
        throw new Error("Please select a CSV file");
      }
      return uploadSchoolStudentsCsv(schoolId, uploadFile, uploadDryRun);
    },
    onSuccess: async (payload) => {
      setUploadResult(payload);
      await refresh();
    },
  });

  const createProgramMutation = useMutation({
    mutationFn: () => {
      const objectives = programForm.objectives
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      return createSchoolProgram(schoolId, {
        name: programForm.name.trim(),
        description: programForm.description.trim(),
        durationMonths: Number(programForm.durationMonths),
        minSessionsPerMonth: Number(programForm.minSessionsPerMonth),
        objectives,
        targetEducationLevels: programForm.targetEducationLevels,
        startDate: programForm.startDate,
        endDate: programForm.endDate,
        isActive: programForm.isActive,
      });
    },
    onSuccess: refresh,
  });

  const updateProgramMutation = useMutation({
    mutationFn: () => {
      if (!editingProgram) {
        throw new Error("No program selected");
      }

      const objectives = programForm.objectives
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      return updateSchoolProgram(schoolId, editingProgram.id, {
        name: programForm.name.trim(),
        description: programForm.description.trim(),
        durationMonths: Number(programForm.durationMonths),
        minSessionsPerMonth: Number(programForm.minSessionsPerMonth),
        objectives,
        targetEducationLevels: programForm.targetEducationLevels,
        startDate: programForm.startDate,
        endDate: programForm.endDate,
        isActive: programForm.isActive,
      });
    },
    onSuccess: refresh,
  });

  const toggleProgramMutation = useMutation({
    mutationFn: ({ program, nextIsActive }: NonNullable<Extract<ProgramActionState, { action: "toggle" }>>) =>
      updateSchoolProgram(schoolId, program.id, {
        name: program.name,
        description: program.description,
        durationMonths: program.durationMonths,
        minSessionsPerMonth: program.minSessionsPerMonth,
        objectives: program.objectives,
        targetEducationLevels: program.targetEducationLevels,
        startDate: program.startDate,
        endDate: program.endDate,
        isActive: nextIsActive,
      }),
    onSuccess: refresh,
  });

  const deleteProgramMutation = useMutation({
    mutationFn: (programId: string) => deleteSchoolProgram(schoolId, programId),
    onSuccess: refresh,
  });

  const openProgramCreateModal = () => {
    resetProgramForm();
    setOpen("program");
  };

  const openProgramEditModal = (program: NonNullable<typeof school>["programs"][number]) => {
    setEditingProgram(program);
    setProgramForm({
      name: program.name,
      description: program.description,
      durationMonths: String(program.durationMonths),
      minSessionsPerMonth: String(program.minSessionsPerMonth),
      objectives: program.objectives.join(", "),
      startDate: program.startDate,
      endDate: program.endDate,
      isActive: program.isActive,
      targetEducationLevels: program.targetEducationLevels,
    });
    setOpen("program");
  };

  const openHeadModal = () => {
    if (!school) {
      return;
    }
    setHeadForm({
      principalName: principalAssigned ? school.principalName : "",
      principalEmail: principalAssigned ? school.principalEmail : "",
    });
    setOpen("head");
  };

  const openProgramToggleModal = (program: NonNullable<typeof school>["programs"][number]) => {
    setProgramAction({
      action: "toggle",
      program,
      nextIsActive: !program.isActive,
    });
  };

  const openProgramDeleteModal = (program: NonNullable<typeof school>["programs"][number]) => {
    setProgramAction({
      action: "delete",
      program,
    });
  };

  const submitProgramAction = async () => {
    if (!programAction) {
      return;
    }

    try {
      if (programAction.action === "toggle") {
        await toggleProgramMutation.mutateAsync(programAction);
        pushToast({
          title: programAction.nextIsActive ? "Program Activated" : "Program Deactivated",
          description: `${programAction.program.name} has been updated.`,
          variant: "success",
        });
      } else {
        await deleteProgramMutation.mutateAsync(programAction.program.id);
        pushToast({
          title: "Program Deleted",
          description: `${programAction.program.name} has been removed.`,
          variant: "success",
        });
      }

      closeProgramActionModal();
    } catch (error) {
      pushToast({
        title: programAction.action === "delete" ? "Could not delete program" : "Could not update status",
        description: error instanceof Error ? error.message : "Request failed.",
        variant: "error",
      });
    }
  };

  const submitAdmin = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const payload = await adminMutation.mutateAsync();
      pushToast({
        title: "School Admin Added",
        description: `${payload.item.email} created successfully.`,
        variant: "success",
      });
      await confirmAdminCreated(payload.item.email);
      setAdminForm(emptyAdminForm);
      closeModal();
    } catch (error) {
      pushToast({
        title: "Could not add admin",
        description: error instanceof Error ? error.message : "Request failed.",
        variant: "error",
      });
    }
  };

  const submitHead = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await headMutation.mutateAsync();
      pushToast({
        title: "Head Updated",
        description: "Principal details were updated.",
        variant: "success",
      });
      closeModal();
    } catch (error) {
      pushToast({
        title: "Could not update head",
        description: error instanceof Error ? error.message : "Request failed.",
        variant: "error",
      });
    }
  };

  const submitStudent = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const payload = await studentMutation.mutateAsync();
      pushToast({
        title: "Student Added",
        description: `${payload.item.name} is now in waiting status.`,
        variant: "success",
      });
      setStudentForm(emptyStudentForm);
      closeModal();
    } catch (error) {
      pushToast({
        title: "Could not add student",
        description: error instanceof Error ? error.message : "Request failed.",
        variant: "error",
      });
    }
  };

  const submitUpload = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const payload = await uploadMutation.mutateAsync();
      setUploadResult(payload);
      pushToast({
        title: payload.summary.dryRun ? "Dry Run Complete" : "Upload Complete",
        description: `Processed ${payload.summary.totalRows} rows.`,
        variant: "success",
      });
    } catch (error) {
      pushToast({
        title: "Could not upload CSV",
        description: error instanceof Error ? error.message : "Request failed.",
        variant: "error",
      });
    }
  };

  const submitProgram = async (event: FormEvent) => {
    event.preventDefault();
    if (programForm.targetEducationLevels.length === 0) {
      pushToast({
        title: "Target Level Required",
        description: "Select at least one education level.",
        variant: "error",
      });
      return;
    }

    try {
      if (editingProgram) {
        await updateProgramMutation.mutateAsync();
        pushToast({
          title: "Program Updated",
          description: "Program changes have been saved.",
          variant: "success",
        });
      } else {
        await createProgramMutation.mutateAsync();
        pushToast({
          title: "Program Created",
          description: "Program is now available for matching.",
          variant: "success",
        });
      }
      closeModal();
    } catch (error) {
      pushToast({
        title: editingProgram ? "Could not update program" : "Could not create program",
        description: error instanceof Error ? error.message : "Request failed.",
        variant: "error",
      });
    }
  };

  return {
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
    pending: {
      admin: adminMutation.isPending,
      head: headMutation.isPending,
      student: studentMutation.isPending,
      upload: uploadMutation.isPending,
      createProgram: createProgramMutation.isPending,
      updateProgram: updateProgramMutation.isPending,
      toggleProgram: toggleProgramMutation.isPending,
      deleteProgram: deleteProgramMutation.isPending,
    },
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
  };
}
