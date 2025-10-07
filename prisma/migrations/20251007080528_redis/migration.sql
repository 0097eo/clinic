/*
  Warnings:

  - Added the required column `quantity` to the `PrescriptionItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LabOrder" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "Prescription" ADD COLUMN     "dispensed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dispensedAt" TIMESTAMP(3),
ADD COLUMN     "dispensedBy" TEXT;

-- AlterTable
ALTER TABLE "PrescriptionItem" ADD COLUMN     "quantity" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_dispensedBy_fkey" FOREIGN KEY ("dispensedBy") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
