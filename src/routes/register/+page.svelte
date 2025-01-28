<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import '../../app.css'
</script>

<div class="flex h-screen w-full items-center justify-center px-4 bg-blue-200">
    <Card.Root class="mx-auto max-w-sm">
        <Card.Header>
            <Card.Title class="text-2xl">Register</Card.Title>
            <Card.Description>Enter your details below to create an account</Card.Description>
        </Card.Header>
        <Card.Content>
            <div class="grid gap-4">
                <div class="grid gap-2">
                    <Label for="email">Email</Label>
                    <Input id="email" type="email" placeholder="m@example.com" required />
                </div>
                <div class="grid gap-2">
                    <Label for="password">Password</Label>
                    <Input id="password" type="password" required />
                </div>
                <div class="grid gap-2">
                    <Label for="confirm-password">Confirm Password</Label>
                    <Input id="confirm-password" type="password" required />
                </div>
                <Button href="/login" type="submit" class="w-full">Register</Button>
            </div>
            <div class="mt-4 text-center text-sm">
                Already have an account?
                <a href="/login" class="underline"> Sign in </a>
            </div>
        </Card.Content>
    </Card.Root>
</div>
