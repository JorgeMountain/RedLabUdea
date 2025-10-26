ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservable_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

DROP FUNCTION IF EXISTS public.is_teacher(uuid);

CREATE FUNCTION public.is_teacher(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = uid
      AND role = 'teacher'
  );
$function$;

ALTER FUNCTION public.is_teacher(uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.is_teacher(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_teacher(uuid) TO anon, authenticated, service_role;

-- perfiles: cada quien gestiona su registro, los docentes pueden consultar perfiles
DROP POLICY IF EXISTS profiles_own ON profiles;
CREATE POLICY profiles_own ON profiles
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS profiles_teacher_view ON profiles;
CREATE POLICY profiles_teacher_view ON profiles
FOR SELECT
TO authenticated
USING (true);

-- lab_items: lectura publica; escritura solo docentes
DROP POLICY IF EXISTS items_read ON lab_items;
CREATE POLICY items_read ON lab_items
FOR SELECT USING (true);

DROP POLICY IF EXISTS items_write_teacher ON lab_items;
CREATE POLICY items_write_teacher ON lab_items
FOR ALL
USING (
  public.is_teacher(auth.uid())
)
WITH CHECK (
  public.is_teacher(auth.uid())
);

-- loan_requests: estudiante ve/crea las suyas; docente ve todas
DROP POLICY IF EXISTS requests_select_student_or_teacher ON loan_requests;
CREATE POLICY requests_select_student_or_teacher ON loan_requests
FOR SELECT
USING (
  student_id = auth.uid()
  OR public.is_teacher(auth.uid())
);

DROP POLICY IF EXISTS requests_insert_student ON loan_requests;
CREATE POLICY requests_insert_student ON loan_requests
FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS requests_update_owner_or_teacher ON loan_requests;
CREATE POLICY requests_update_owner_or_teacher ON loan_requests
FOR UPDATE
USING (
  student_id = auth.uid()
  OR public.is_teacher(auth.uid())
);

-- loan_request_items: accesibles a su propietario o docentes
DROP POLICY IF EXISTS request_items_access ON loan_request_items;
CREATE POLICY request_items_access ON loan_request_items
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM loan_requests r
    WHERE r.id = loan_request_items.request_id
      AND (
        r.student_id = auth.uid()
        OR public.is_teacher(auth.uid())
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM loan_requests r
    WHERE r.id = loan_request_items.request_id
      AND (
        r.student_id = auth.uid()
        OR public.is_teacher(auth.uid())
      )
  )
);

-- stock_moves: solo docentes
DROP POLICY IF EXISTS stock_moves_teacher ON stock_moves;
CREATE POLICY stock_moves_teacher ON stock_moves
FOR ALL
USING (
  public.is_teacher(auth.uid())
)
WITH CHECK (
  public.is_teacher(auth.uid())
);

-- reservable_resources: lectura publica; escritura docentes
DROP POLICY IF EXISTS resources_read ON reservable_resources;
CREATE POLICY resources_read ON reservable_resources
FOR SELECT USING (true);

DROP POLICY IF EXISTS resources_write_teacher ON reservable_resources;
CREATE POLICY resources_write_teacher ON reservable_resources
FOR ALL
USING (
  public.is_teacher(auth.uid())
)
WITH CHECK (
  public.is_teacher(auth.uid())
);

-- reservations: estudiante ve/crea las suyas; docente ve todas
DROP POLICY IF EXISTS reservations_select_student_or_teacher ON reservations;
CREATE POLICY reservations_select_student_or_teacher ON reservations
FOR SELECT
USING (
  student_id = auth.uid()
  OR public.is_teacher(auth.uid())
);

DROP POLICY IF EXISTS reservations_insert_student ON reservations;
CREATE POLICY reservations_insert_student ON reservations
FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS reservations_update_owner_or_teacher ON reservations;
CREATE POLICY reservations_update_owner_or_teacher ON reservations
FOR UPDATE
USING (
  student_id = auth.uid()
  OR public.is_teacher(auth.uid())
);
