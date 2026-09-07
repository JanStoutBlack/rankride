-- Apply policies after the new enum values have been committed.
CREATE POLICY "Administrators can manage ranks" ON public.ranks
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'superadmin')
  );

CREATE POLICY "Administrators can manage vehicles" ON public.vehicles
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'superadmin')
  );

CREATE POLICY "Administrators can view trips" ON public.trips
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'superadmin')
  );

CREATE POLICY "Administrators can update trips" ON public.trips
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'superadmin')
  );

CREATE POLICY "Administrators can manage maintenance" ON public.maintenance_logs
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'superadmin')
  );
