# Launch checklist

The `/admin` overview shows a live version of this list.

## Confirmed and already on the site

- [x] Event: Eco-friendly Diwali Mandi 2026
- [x] Date and time: Tuesday 27 October 2026, 9 am to 3 pm
- [x] Venue: S. B. Patil Institute of Management, Pradhikaran Road, Haveli, Maharashtra 411044 (with Google Maps directions)
- [x] Stall name: TERRA UTSAV. Mascot: Koochu Puchu (original)
- [x] Instagram: https://www.instagram.com/pcet_terra_utsav ("Follow us on Instagram")
- [x] Attractions: Chocolate Bomb, Chat Papdi, homemade Diwali diyas, 60-second wet-brick challenge, Catch the Koochu Puchu

## Still needed (organisers or team)

**Event**
- [ ] Exact stall spot on the campus (admin > Event > Stall spot)

**Menu and diyas**
- [ ] Prices for Chocolate Bomb, Chat Papdi and the diyas (admin > Menu)
- [ ] Real photos of the food and of the homemade diyas
- [ ] Check the descriptions; add ingredient or allergen information only if it is verified
- [ ] Confirm the approved taglines are still right ("Crack it. Pour it. Devour it." implies something is poured)

**Rewards**
- [x] What a coupon is worth: 50% off a Chocolate Bomb (the default; check it in admin > Rewards)
- [x] One coupon per player (enforced by the database)
- [ ] Coupon expiry (for example 27 Oct 2026, 3 pm IST) and how many coupons exist in total
- [ ] Tick "terms confirmed" in admin > Rewards (coupons are switched on by default). **Reward play stays closed until
      you do**
- [ ] Check the event's start and end times in admin > Event: reward play opens and closes with them (event day only)
- [ ] Brief the staff: **one coupon per person**. A second coupon from the same person is not redeemed (the staff
      console reminds them)

**Brick challenge**
- [ ] Organisers approve or edit the draft safety and eligibility rules in `src/content/challenge.ts`, then set
      `rulesApproved: true`
- [ ] Decide whether there is a prize, how many attempts each person gets, and who supervises

**Team**
- [x] Real team groups: the 7 groups from the roster (Group Leader to Sales and Marketing)
- [x] 17 students: names, groups and photos from the supplied roster and PDF
- [ ] **Check every photo is on the right person** (photos were matched in page order: PDF page N = roster person N)
- [ ] Confirm every student agreed to their photo being published
- [x] 3 mentors: Ankush, Jidnyesh and Sairaj, with photos from the supplied PDF, in a row under the team
- [ ] **Check each mentor photo is on the right name** (matched in page order: PDF page N = mentor N) and that all
      three agreed to their photo being published
- [ ] Mentor designations (shown as "Mentor" for now) and full names, if they want them shown
- [ ] A contact email for photo changes (admin > Event); until then the team page points to Instagram
- [ ] Optional one-line descriptions per group, and bios or links per person

**Game**
- [x] Cut to three levels (modelled: about 1 in 4 players wins within two attempts)
- [ ] Playtest with 10 or more people on phones; compare the admin "Actual" win rate with the model; adjust in admin > Game
- [ ] Decide what happens if someone wins when coupons run out

**Accounts and services**
- [ ] Supabase project, migrations applied
- [ ] Authentication: **turn on anonymous sign-ins** (players' guest accounts) and raise their rate limit to a few
      hundred an hour (one campus Wi-Fi address is shared by many phones)
- [ ] Staff and admin accounts: Authentication > Users > Add user, with a strong password and Auto Confirm User; then
      give each their role
- [ ] The day before the event: open the Supabase dashboard (free projects pause after about a week of low activity;
      Resume project if needed) and do the staff dry run
- [ ] Leave CAPTCHA off in Supabase (the site does not send a CAPTCHA token)
- [ ] First admin added by SQL; staff accounts added in admin
- [x] GitHub repository: `OnkarAI03/terra-utsav` (public; everyone in the team photos agreed)
- [ ] Netlify site imported from the repository and renamed (for example `terra-utsav.netlify.app`)
- [ ] Netlify environment variables: the Supabase URL, publishable key and secret key; then trigger a deploy
- [ ] A staff dry run: win a coupon on a staff account (staff can play before the event), redeem it on another staff
      phone, try redeeming again (must fail), then cancel the test coupon in admin
- [ ] Ask Koochu Puchu (the chat button) the questions visitors will ask; anything it can't answer is a gap on the site
- [ ] On a phone that has never played: tap Play for a reward during the event window and check a guest is made (no
      sign-up screen)

**Files**
- [ ] Save the approved homepage screenshot as `design/reference/homepage-final.png`
