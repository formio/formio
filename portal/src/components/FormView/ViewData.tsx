import { useState } from "react";
import {
    SubmissionTable,
    useFormioContext,
    SubmissionTableProps,
    Form,
    FormProps,
} from "@formio/react";
import { Utils } from "@formio/js";

const components: SubmissionTableProps["components"] = {
    Container: ({ children }) => <div className="table-wrap">{children}</div>,
    TableContainer: ({ children }) => (
        <div className="table remember-focus-table">{children}</div>
    ),
    TableHeadContainer: ({ children }) => <div>{children}</div>,
    TableHeaderRowContainer: ({ children }) => (
        <div className="trow heading">{children}</div>
    ),
    TableHeadCell: ({ children }) => <div className="tcol">{children}</div>,
    TableBodyRowContainer: ({ children, onClick }) => (
        <div className="trow entry" onClick={onClick}>
            {children}
        </div>
    ),
    TableBodyContainer: ({ children }) => <div>{children}</div>,
    TableCell: ({ children }) => <div className="tcol">{children}</div>,
    PaginationContainer: ({ children }) => (
        <div className="table-pagination">
            <div className="table-pagination-controls">{children}</div>
        </div>
    ),
    PaginationButton: ({ children, isActive, onClick, disabled }) => (
        <a
            className={`pagination-btn${isActive ? " active" : ""}${disabled ? " disabled" : ""}`}
            onClick={onClick}
        >
            {children}
        </a>
    ),
};

type Submission = NonNullable<FormProps["submission"]> & { _id: string };

export const ViewData = ({ formId }: { formId: string }) => {
    const [submission, setSubmission] = useState<Submission | null>(null);
    const { Formio, token } = useFormioContext();

    const handleSubmissionRowClick = async (id: string) => {
        const formio = new Formio(
            `${Formio.projectUrl || Formio.baseUrl}/form/${formId}/submission/${id}`
        );
        try {
            const submission = await formio.loadSubmission();
            setSubmission(submission);
        } catch (err) {
            console.log("Error while loading submission:", err);
        }
    };

    const handleDeleteSubmission = async () => {
        if (!submission) {
            return;
        }
        const formio = new Formio(
            `${Formio.projectUrl || Formio.baseUrl}/form/${formId}/submission/${submission._id}`
        );
        try {
            await formio.deleteSubmission();
            setSubmission(null);
        } catch (err) {
            console.log("Error while deleting submission:", err);
        }
    };

    const handleExport = async (exportType: "json" | "csv") => {
        const filename = `${formId}-submissions.${exportType}`;
        try {
            const queryString = `?format=${exportType}&timezone=${encodeURIComponent(Utils.currentTimezone())}${exportType === "csv" ? "&view=formatted" : ""}`;
            const response = await fetch(
                `/form/${formId}/export${queryString}`,
                { headers: { "x-jwt-token": token } }
            );
            if (!response.ok) {
                throw new Error(`Error fetching data: ${response.statusText}`);
            }
            if (exportType === "json") {
                const data = await response.json();
                const blob = new Blob([JSON.stringify(data, null, 2)], {
                    type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                // Append the link to the document body (necessary for Firefox)
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else if (exportType === "csv") {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error("Error downloading the JSON file:", error);
        }
    };

    return (
        <div className="panel view-data active">
            <div className="button-wrap export">
                <button
                    className="button export-json small withiconright"
                    onClick={() => handleExport("json")}
                >
                    Export JSON <i className="ri-download-2-line"></i>
                </button>
                <button
                    className="button export-csv small withiconright"
                    onClick={() => handleExport("csv")}
                >
                    Export CSV <i className="ri-download-2-line"></i>
                </button>
                <button className="button commercial pdf small withicon">
                    <img src="icon-formio-small.svg" alt="Form.io Icon" />
                    Print To PDF
                </button>
                <div className="helptext">
                    To flag which fields appear in the table below, click{" "}
                    <span className="strong italic">Edit Form</span> above, view
                    the <span className="strong italic">Settings</span> for any
                    one field, then toggle the{" "}
                    <span className="strong italic">Table View</span> checkbox.
                </div>
            </div>
            {submission ? (
                <>
                    <SubmissionTable
                        submissions={[submission]}
                        formId={formId}
                        limit={10}
                        components={{
                            ...components,
                            PaginationButton: ({ children, isActive }) => (
                                <a
                                    className={`pagination-btn disabled${isActive ? " active" : ""}`}
                                >
                                    {children}
                                </a>
                            ),
                        }}
                    />
                    <div className="entry-details-wrap active">
                        <div className="entry-details-menu-wrap">
                            <button
                                className="close-button close-entry-details"
                                onClick={() => setSubmission(null)}
                            >
                                <i className="ri-close-line"></i>
                            </button>
                            <button
                                className="button pink small open-lightbox"
                                onClick={handleDeleteSubmission}
                            >
                                Delete{" "}
                                <span className="longword">Submission</span>
                            </button>
                        </div>
                        <div className="entry-details-content edit-submission active">
                            <Form
                                submission={submission}
                                src={`/form/${formId}`}
                                onSubmitDone={() => setSubmission(null)}
                            />
                        </div>
                    </div>
                </>
            ) : (
                <SubmissionTable
                    onSubmissionClick={handleSubmissionRowClick}
                    limit={10}
                    formId={formId}
                    components={components}
                />
            )}
        </div>
    );
};
