
SET SERVEROUTPUT ON;
DECLARE
  v_rows_affected NUMBER;
BEGIN
  UPDATE ORDERS 
  SET status = 'WAITING_CONFIRM', rider_id = 4 
  WHERE order_id = 10;
  
  v_rows_affected := SQL%ROWCOUNT;
  DBMS_OUTPUT.PUT_LINE('Rows affected: ' || v_rows_affected);
  
  COMMIT;
  
  SELECT status, rider_id INTO v_rows_affected, v_rows_affected FROM ORDERS WHERE order_id = 10; -- just to check
  DBMS_OUTPUT.PUT_LINE('Status updated!');
END;
/
