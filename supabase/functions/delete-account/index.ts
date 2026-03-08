import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the user with their token
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get user's profile to find their business
    const { data: profile } = await adminClient
      .from("profiles")
      .select("business_id")
      .eq("user_id", userId)
      .maybeSingle();

    // Get all businesses owned by this user
    const { data: ownedBusinesses } = await adminClient
      .from("businesses")
      .select("id")
      .eq("owner_id", userId);

    const businessIds = new Set<string>();
    (ownedBusinesses || []).forEach((b: any) => businessIds.add(b.id));
    if (profile?.business_id) businessIds.add(profile.business_id);

    // Also check business_members
    const { data: memberships } = await adminClient
      .from("business_members")
      .select("business_id")
      .eq("user_id", userId);
    (memberships || []).forEach((m: any) => businessIds.add(m.business_id));

    // For each business, check if user is sole member
    for (const bizId of businessIds) {
      const { data: otherProfiles } = await adminClient
        .from("profiles")
        .select("user_id")
        .eq("business_id", bizId)
        .neq("user_id", userId);

      const { data: otherMembers } = await adminClient
        .from("business_members")
        .select("user_id")
        .eq("business_id", bizId)
        .neq("user_id", userId);

      const hasOthers = (otherProfiles || []).length > 0 || (otherMembers || []).length > 0;

      // Remove user's partner record from this business
      await adminClient.from("partners").delete().eq("business_id", bizId).eq("user_id", userId);

      if (!hasOthers) {
        // Sole owner — delete entire business and all data
        const { data: delReqs } = await adminClient.from("business_deletion_requests").select("id").eq("business_id", bizId);
        for (const dr of (delReqs || [])) {
          await adminClient.from("business_deletion_votes").delete().eq("request_id", dr.id);
        }
        await adminClient.from("business_deletion_requests").delete().eq("business_id", bizId);

        const { data: leaveReqs } = await adminClient.from("partner_leave_requests").select("id").eq("business_id", bizId);
        for (const lr of (leaveReqs || [])) {
          await adminClient.from("partner_leave_votes").delete().eq("request_id", lr.id);
        }
        await adminClient.from("partner_leave_requests").delete().eq("business_id", bizId);

        await adminClient.from("customer_ledger").delete().eq("business_id", bizId);
        await adminClient.from("returns").delete().eq("business_id", bizId);
        await adminClient.from("sales").delete().eq("business_id", bizId);
        await adminClient.from("purchase_transactions").delete().eq("business_id", bizId);
        await adminClient.from("exchanges").delete().eq("business_id", bizId);
        await adminClient.from("partner_transfers").delete().eq("business_id", bizId);
        await adminClient.from("capital_contributions").delete().eq("business_id", bizId);
        await adminClient.from("expenses").delete().eq("business_id", bizId);
        await adminClient.from("sample_orders").delete().eq("business_id", bizId);
        await adminClient.from("activity_log").delete().eq("business_id", bizId);
        await adminClient.from("notifications").delete().eq("business_id", bizId);
        await adminClient.from("customers").delete().eq("business_id", bizId);
        await adminClient.from("inventory_items").delete().eq("business_id", bizId);
        await adminClient.from("partners").delete().eq("business_id", bizId);
        await adminClient.from("business_members").delete().eq("business_id", bizId);
        await adminClient.from("businesses").delete().eq("id", bizId);
      }
    }

    // Delete remaining user data
    await adminClient.from("notifications").delete().eq("user_id", userId);
    await adminClient.from("business_members").delete().eq("user_id", userId);
    await adminClient.from("profiles").delete().eq("user_id", userId);

    // Finally, delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
