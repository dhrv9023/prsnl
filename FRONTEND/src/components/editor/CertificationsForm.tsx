import React from "react";
import { Award, Plus, Trash2, Link as LinkIcon } from "lucide-react";
import { Button } from "../ui/button";
import type { CertificationItem } from "../../types/resumeEditor";
import { newId } from "../../types/resumeEditor";

interface CertificationsFormProps {
  certifications: CertificationItem[];
  onChange: (certifications: CertificationItem[]) => void;
}

export const CertificationsForm: React.FC<CertificationsFormProps> = ({
  certifications,
  onChange,
}) => {
  const handleAdd = () => {
    const newCert: CertificationItem = {
      id: newId(),
      name: "",
      issuer: "",
      date: "",
      url: "",
    };
    onChange([...certifications, newCert]);
  };

  const handleRemove = (index: number) => {
    onChange(certifications.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, patch: Partial<CertificationItem>) => {
    onChange(
      certifications.map((c, i) => (i === index ? { ...c, ...patch } : c))
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Certifications & Licenses
          </h2>
          <p className="text-xs text-muted-foreground">
            Professional certifications, cloud credentials, or licenses (e.g. AWS, GCP, CKA).
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="gap-1.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" /> Add Credential
        </Button>
      </div>

      {certifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-8 text-center bg-card/30">
          <Award className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-xs font-medium text-foreground">No certifications added</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Add verified credentials to stand out to automated keyword screeners.
          </p>
          <Button
            variant="default"
            size="sm"
            onClick={handleAdd}
            className="mt-3 gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Add Certification
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {certifications.map((cert, index) => (
            <div
              key={cert.id}
              className="rounded-xl border border-border/40 bg-card/50 p-3.5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs font-semibold text-foreground">
                    {cert.name || "Certification"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition"
                  title="Delete certification"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground">
                    Certification Name
                  </label>
                  <input
                    type="text"
                    value={cert.name || ""}
                    onChange={(e) =>
                      handleUpdate(index, { name: e.target.value })
                    }
                    placeholder="e.g. AWS Solutions Architect Professional"
                    className="w-full rounded-lg border border-border/40 bg-secondary/20 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition"
                  />
                </div>

                {/* Issuer */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground">
                    Issuing Organization
                  </label>
                  <input
                    type="text"
                    value={cert.issuer || ""}
                    onChange={(e) =>
                      handleUpdate(index, { issuer: e.target.value })
                    }
                    placeholder="e.g. Amazon Web Services"
                    className="w-full rounded-lg border border-border/40 bg-secondary/20 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition"
                  />
                </div>

                {/* Issue Date */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground">
                    Issue Date
                  </label>
                  <input
                    type="text"
                    value={cert.date || ""}
                    onChange={(e) =>
                      handleUpdate(index, { date: e.target.value })
                    }
                    placeholder="e.g. March 2023"
                    className="w-full rounded-lg border border-border/40 bg-secondary/20 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition"
                  />
                </div>

                {/* Credential URL */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground flex items-center gap-1">
                    <LinkIcon className="h-3 w-3 text-muted-foreground" /> Credential URL / ID
                  </label>
                  <input
                    type="url"
                    value={cert.url || ""}
                    onChange={(e) =>
                      handleUpdate(index, { url: e.target.value })
                    }
                    placeholder="https://credly.com/earner/..."
                    className="w-full rounded-lg border border-border/40 bg-secondary/20 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
