-- Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Perfiles y roles
CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  role text CHECK (role IN ('student','teacher')) DEFAULT 'student',
  created_at timestamptz DEFAULT now()
);

-- Inventario (equipos prestables por stock)
CREATE TABLE IF NOT EXISTS lab_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  category text,
  stock int NOT NULL DEFAULT 0,
  spec_summary text,
  datasheet_url text,
  created_at timestamptz DEFAULT now()
);

-- Solicitudes de prestamo (encabezado)
CREATE TABLE IF NOT EXISTS loan_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','returned')),
  teacher_id uuid REFERENCES auth.users(id),
  decided_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Detalle de prestamo (items + cantidades)
CREATE TABLE IF NOT EXISTS loan_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES loan_requests(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES lab_items(id),
  quantity int NOT NULL CHECK (quantity > 0)
);

-- Auditoria de stock
CREATE TABLE IF NOT EXISTS stock_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES lab_items(id),
  request_id uuid REFERENCES loan_requests(id),
  delta int NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Recursos reservables
CREATE TABLE IF NOT EXISTS reservable_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  location text,
  category text,
  description text,
  requires_approval boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Reservas con rango de tiempo
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES reservable_resources(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  during tstzrange GENERATED ALWAYS AS (tstzrange(start_at, end_at, '[)')) STORED,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled','done')),
  teacher_id uuid REFERENCES auth.users(id),
  decided_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CHECK (start_at < end_at)
);

-- Indices y restricciones
CREATE INDEX IF NOT EXISTS idx_requests_by_student ON loan_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_request_items_by_request ON loan_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_reservations_by_resource ON reservations(resource_id);
CREATE INDEX IF NOT EXISTS idx_reservations_by_student ON reservations(student_id);
CREATE INDEX IF NOT EXISTS reservations_resource_gist ON reservations USING gist (resource_id, during);
