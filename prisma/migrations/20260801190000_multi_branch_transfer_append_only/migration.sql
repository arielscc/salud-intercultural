-- Los traslados son evidencia enlazada de una salida y una entrada. Se pueden
-- compensar con otro traslado, pero nunca editar ni borrar.
CREATE TRIGGER "InventoryTransfer_append_only"
BEFORE UPDATE OR DELETE ON "InventoryTransfer"
FOR EACH ROW EXECUTE FUNCTION "prevent_purchase_evidence_mutation"();
