import { Form, FormProps, useFormioContext } from "@formio/react";
import { Form as FormType, Access, Role } from "@formio/core";
import { useEffect, useState } from "react";

const getFormAccessForm = (roles: Role[]): FormType => ({
    display: 'form',
    components: [
        {
            type: "container",
            key: "submissionAccess",
            input: true,
            components: [
                {
                    label: "<b>Read Own Submissions</b>",
                    labelPosition: "left-left",
                    widget: "choicesjs",
                    tableView: true,
                    multiple: true,
                    dataSrc: "values",
                    data: {
                        values: roles.map((role) => ({
                            label: role.title,
                            value: role._id,
                        })),
                    },
                    idPath: "_id",
                    template: "<span>{{ item.label }}</span>",
                    key: "read_own",
                    type: "select",
                    disableLimit: false,
                    noRefreshOnScroll: false,
                    input: true,
                },
                {
                    label: "<b>Update Own Submissions</b>",
                    labelPosition: "left-left",
                    widget: "choicesjs",
                    tableView: true,
                    multiple: true,
                    dataSrc: "values",
                    data: {
                        values: roles.map((role) => ({
                            label: role.title,
                            value: role._id,
                        })),
                    },
                    key: "update_own",
                    template: "<span>{{ item.label }}</span>",
                    type: "select",
                    disableLimit: false,
                    noRefreshOnScroll: false,
                    input: true,
                },
                {
                    label: "<b>Delete Own Submissions</b>",
                    labelPosition: "left-left",
                    widget: "choicesjs",
                    tableView: true,
                    multiple: true,
                    dataSrc: "values",
                    template: "<span>{{ item.label }}</span>",
                    data: {
                        values: roles.map((role) => ({
                            label: role.title,
                            value: role._id,
                        })),
                    },
                    key: "delete_own",
                    type: "select",
                    disableLimit: false,
                    noRefreshOnScroll: false,
                    input: true,
                },
                {
                    label: "<b>Read All Submissions</b>",
                    labelPosition: "left-left",
                    widget: "choicesjs",
                    tableView: true,
                    multiple: true,
                    dataSrc: "values",
                    template: "<span>{{ item.label }}</span>",
                    data: {
                        values: roles.map((role) => ({
                            label: role.title,
                            value: role._id,
                        })),
                    },
                    key: "read_all",
                    type: "select",
                    disableLimit: false,
                    noRefreshOnScroll: false,
                    input: true,
                },
                {
                    label: "<b>Update All Submissions</b>",
                    labelPosition: "left-left",
                    widget: "choicesjs",
                    tableView: true,
                    multiple: true,
                    dataSrc: "values",
                    template: "<span>{{ item.label }}</span>",
                    data: {
                        values: roles.map((role) => ({
                            label: role.title,
                            value: role._id,
                        })),
                    },
                    key: "update_all",
                    type: "select",
                    disableLimit: false,
                    noRefreshOnScroll: false,
                    input: true,
                },
                {
                    label: "<b>Delete All Submissions</b>",
                    labelPosition: "left-left",
                    widget: "choicesjs",
                    template: "<span>{{ item.label }}</span>",
                    tableView: true,
                    multiple: true,
                    dataSrc: "values",
                    data: {
                        values: roles.map((role) => ({
                            label: role.title,
                            value: role._id,
                        })),
                    },
                    key: "delete_all",
                    type: "select",
                    disableLimit: false,
                    noRefreshOnScroll: false,
                    input: true,
                },
            ],
        },
        {
            type: "container",
            input: true,
            key: "access",
            components: [
                {
                    label: "<b>Read Own Forms</b>",
                    labelPosition: "left-left",
                    widget: "choicesjs",
                    tableView: true,
                    multiple: true,
                    dataSrc: "values",
                    data: {
                        values: roles.map((role) => ({
                            label: role.title,
                            value: role._id,
                        })),
                    },
                    idPath: "_id",
                    template: "<span>{{ item.label }}</span>",
                    key: "read_own",
                    type: "select",
                    disableLimit: false,
                    noRefreshOnScroll: false,
                    input: true,
                },
                {
                    label: "<b>Update Own Forms</b>",
                    labelPosition: "left-left",
                    widget: "choicesjs",
                    tableView: true,
                    multiple: true,
                    dataSrc: "values",
                    data: {
                        values: roles.map((role) => ({
                            label: role.title,
                            value: role._id,
                        })),
                    },
                    template: "<span>{{ item.label }}</span>",
                    key: "update_own",
                    type: "select",
                    disableLimit: false,
                    noRefreshOnScroll: false,
                    input: true,
                },
                {
                    label: "<b>Delete Own Forms</b>",
                    labelPosition: "left-left",
                    widget: "choicesjs",
                    tableView: true,
                    multiple: true,
                    dataSrc: "values",
                    data: {
                        values: roles.map((role) => ({
                            label: role.title,
                            value: role._id,
                        })),
                    },
                    template: "<span>{{ item.label }}</span>",
                    key: "delete_own",
                    type: "select",
                    disableLimit: false,
                    noRefreshOnScroll: false,
                    input: true,
                },
                {
                    label: "<b>Read All Forms</b>",
                    labelPosition: "left-left",
                    widget: "choicesjs",
                    tableView: true,
                    multiple: true,
                    dataSrc: "values",
                    data: {
                        values: roles.map((role) => ({
                            label: role.title,
                            value: role._id,
                        })),
                    },
                    template: "<span>{{ item.label }}</span>",
                    key: "read_all",
                    type: "select",
                    disableLimit: false,
                    noRefreshOnScroll: false,
                    input: true,
                },
                {
                    label: "<b>Update All Forms</b>",
                    labelPosition: "left-left",
                    widget: "choicesjs",
                    tableView: true,
                    multiple: true,
                    dataSrc: "values",
                    data: {
                        values: roles.map((role) => ({
                            label: role.title,
                            value: role._id,
                        })),
                    },
                    template: "<span>{{ item.label }}</span>",
                    key: "update_all",
                    type: "select",
                    disableLimit: false,
                    noRefreshOnScroll: false,
                    input: true,
                },
                {
                    label: "<b>Delete All Forms</b>",
                    labelPosition: "left-left",
                    widget: "choicesjs",
                    tableView: true,
                    multiple: true,
                    dataSrc: "values",
                    data: {
                        values: roles.map((role) => ({
                            label: role.title,
                            value: role._id,
                        })),
                    },
                    template: "<span>{{ item.label }}</span>",
                    key: "delete_all",
                    type: "select",
                    disableLimit: false,
                    noRefreshOnScroll: false,
                    input: true,
                },
            ],
        },
        {
            type: "button",
            label: "Save Settings",
            key: "saveSettings",
            input: true,
            tableView: false,
            customClass: "button save-access",
            action: "event",
            event: "saveSettings",
        },
    ],
});

const fetchRoles = async (token: string): Promise<Role[]> => {
    const response = await fetch("/role", {
        headers: {
            "x-jwt-token": token,
        },
    });
    if (!response.ok) {
        throw new Error(await response.text());
    }
    return response.json();
};

const mapAccessToSubmission = (access: Access[]) => {
    return access.reduce(
        (acc, { type, roles }) => {
            acc[type] = roles.map((id) => id);
            return acc;
        },
        {} as Record<string, string[]>
    );
};

export const FormAccess = ({ id }: { id: string }) => {
    const { token, Formio } = useFormioContext();
    const [formAccess, setFormAccess] = useState<Access[] | undefined>();
    const [submissionAccess, setSubmissionAccess] = useState<Access[] | undefined>();
    const [roles, setRoles] = useState<Role[] | null>(null);

    useEffect(() => {
        const fetchFormRolesAndAccessSettings = async () => {
            try {
                const formio = new Formio(`/form/${id}`);
                const formPromise: Promise<FormType> = formio.loadForm();
                const rolesPromise: Promise<Role[]> = fetchRoles(token);
                const [form, roles] = await Promise.all([
                    formPromise,
                    rolesPromise,
                ]);
                setRoles(roles);
                setFormAccess(form.access);
                setSubmissionAccess(form.submissionAccess);
            } catch (err) {
                console.error("Error while loading form access:", err);
            }
        };
        fetchFormRolesAndAccessSettings();
    }, [Formio, id, token]);

    const handleCustomEvent: FormProps["onCustomEvent"] = async ({
        type,
        data,
    }) => {
        if (type === "saveSettings") {
            try {
                const formio = new Formio(`/form/${id}`);
                const form = await formio.loadForm();
                const updatedAccess = Object.entries(
                    data.access as Record<string, string[]>
                ).map(([type, roles]) => ({
                    type,
                    roles,
                }));
                const updatedSubmissionAccess = Object.entries(
                    data.submissionAccess as Record<string, string[]>
                ).map(([type, roles]) => ({
                    type,
                    roles,
                }));
                await formio.saveForm({
                    ...form,
                    access: updatedAccess,
                    submissionAccess: updatedSubmissionAccess,
                });
                setFormAccess(updatedAccess as Access[]);
                setSubmissionAccess(updatedSubmissionAccess as Access[]);
            } catch (err) {
                console.error("Error while saving form access:", err);
            }
        }
    };

    return (
        <div className="panel access active">
            <div className="form-access-wrap">
                <div className="comp-inside-box yellow">
                    <p>
                        User Permissions allow you to control who can create,
                        view, and modify form submissions. Here you may assign
                        Project Roles to permissions.{" "}
                        <span className="strong">Roles</span> can be created and
                        edited in the{" "}
                        <span className="strong">default template</span> file.
                    </p>
                </div>
                <div className="form-perms-wrap">
                    {roles?.length && formAccess && submissionAccess ? (
                        <Form
                            src={getFormAccessForm(roles)}
                            submission={{
                                data: {
                                    access: mapAccessToSubmission(formAccess),
                                    submissionAccess:
                                        mapAccessToSubmission(submissionAccess),
                                },
                            }}
                            onCustomEvent={handleCustomEvent}
                        />
                    ) : (
                        <p>Loading...</p>
                    )}
                </div>
            </div>
        </div>
    );
};
