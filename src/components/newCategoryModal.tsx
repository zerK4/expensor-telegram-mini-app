import { PlusIcon } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { CategoryInsertType } from "@/database/schema";
import { useState } from "react";
import { Label } from "./ui/label";
import { useTranslations } from "next-intl";
import { Input } from "./ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addCategory } from "@/app/receipts/add/actions";
import { useUser } from "@/hooks/use-user";

interface FormErrors {
  name?: string;
  icon?: string;
  general?: string;
}

export const NewCategoryModal = () => {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<CategoryInsertType>({
    name: "",
    icon: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ name: boolean; icon: boolean }>({
    name: false,
    icon: false,
  });

  const queryClient = useQueryClient();
  const { user } = useUser();

  // Validation functions
  const validateName = (name: string): string | undefined => {
    if (!name.trim()) {
      return t("category.validation.nameRequired");
    }
    if (name.trim().length < 2) {
      return t("category.validation.nameTooShort");
    }
    if (name.trim().length > 50) {
      return t("category.validation.nameTooLong");
    }
    return undefined;
  };

  const validateIcon = (icon: string): string | undefined => {
    if (!icon.trim()) {
      return t("category.validation.iconRequired");
    }
    // Basic emoji validation - check if it's a single emoji (ES5 compatible)
    const emojiRegex =
      /^[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|[\u1F300-\u1F64F]|[\u1F680-\u1F6FF]$/;
    if (icon.trim().length > 2 || !emojiRegex.test(icon.trim())) {
      return t("category.validation.iconInvalid");
    }

    return undefined;
  };

  const validateForm = (): boolean => {
    const nameError = validateName(category.name);
    const iconError = validateIcon(category.icon);

    setErrors({
      name: nameError,
      icon: iconError,
    });

    return !nameError && !iconError;
  };

  const resetForm = () => {
    setCategory({ name: "", icon: "" });
    setErrors({});
    setTouched({ name: false, icon: false });
  };

  const handleFieldBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Validate specific field on blur
    if (field === "name") {
      const nameError = validateName(category.name);
      setErrors((prev) => ({ ...prev, name: nameError }));
    } else if (field === "icon") {
      const iconError = validateIcon(category.icon);
      setErrors((prev) => ({ ...prev, icon: iconError }));
    }
  };

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      if (!validateForm()) {
        throw new Error("Validation failed");
      }

      const trimmedCategory = {
        name: category.name.trim(),
        icon: category.icon.trim(),
      };

      const data = await addCategory(trimmedCategory);
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["filter-options", user?.id],
      });
      setIsOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Error creating category:", error);

      // Handle specific error types
      if (
        error.message.includes("duplicate") ||
        error.message.includes("unique")
      ) {
        setErrors({ name: t("category.validation.nameExists") });
      } else if (error.message === "Validation failed") {
        // Validation errors are already set
        return;
      } else {
        setErrors({ general: t("category.validation.generalError") });
      }
    },
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    // Mark all fields as touched to show validation errors
    setTouched({ name: true, icon: true });

    if (validateForm()) {
      await mutateAsync();
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset form when closing
      setTimeout(resetForm, 150); // Small delay to avoid flicker
    }
  };

  const isFormValid =
    !validateName(category.name) && !validateIcon(category.icon);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="icon" className="size-11 min-w-11">
          <PlusIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("category.new")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {errors.general && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {errors.general}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="category-name">{t("category.name")}</Label>
              <Input
                id="category-name"
                value={category.name}
                onChange={(e) => {
                  setCategory({ ...category, name: e.target.value });
                  // Clear name error on change if field was touched
                  if (touched.name) {
                    const nameError = validateName(e.target.value);
                    setErrors((prev) => ({ ...prev, name: nameError }));
                  }
                }}
                onBlur={() => handleFieldBlur("name")}
                placeholder={t("category.namePlaceholder")}
                className={
                  errors.name ? "border-red-500 focus-visible:ring-red-500" : ""
                }
                disabled={isPending}
                maxLength={50}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-icon">{t("category.icon")}</Label>
              <Input
                id="category-icon"
                value={category.icon}
                onChange={(e) => {
                  // Limit to single character for emoji
                  const value = e.target.value.slice(0, 2); // Allow up to 2 chars for complex emojis
                  setCategory({ ...category, icon: value });
                  // Clear icon error on change if field was touched
                  if (touched.icon) {
                    const iconError = validateIcon(value);
                    setErrors((prev) => ({ ...prev, icon: iconError }));
                  }
                }}
                onBlur={() => handleFieldBlur("icon")}
                placeholder={t("category.iconPlaceholder")}
                className={`text-center ${errors.icon ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                disabled={isPending}
                maxLength={2}
              />
              {errors.icon && (
                <p className="text-sm text-red-600">{errors.icon}</p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isPending || !isFormValid}
              className="min-w-20"
            >
              {isPending ? "Creating..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
